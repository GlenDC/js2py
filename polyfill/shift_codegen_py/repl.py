import sys
import json
import socketio
import io
import os
import glob
import click
from aiohttp import web
from pexpect import replwrap
import socket
from contextlib import closing
from itertools import chain
from pathlib import Path
import traceback


def find_free_port():
    # util functionality copied from
    # https://stackoverflow.com/a/45690594
    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        s.bind(('', 0))
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return s.getsockname()[1]


class REPL:
    _PY_PATH_GOB = os.path.join(os.path.dirname(
        os.path.realpath(__file__)), 'polyfill', '*.py')

    def __init__(self, history_fp=None):
        self._prelude_cmds = [
            # NOTE: implicitly relies on the fact that shift-codegen_py is installed
            # in a linked modus operandes
            "from shift_codegen_py.polyfill import *",  # required first command
        ]
        self._history_cmds = []
        self._user_cmds = []
        self._repl = self._repl_new()
        self._polyfill_src_mtime_latest = 0
        self._polyfill_src_mtime_latest = self._polyfill_src_mtime()

        # support history for the REPL iff a FilePath (fp) is defined
        self._history_fp = history_fp
        self._load_history_user_cmds()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, exc_traceback):
        self.close()

    def eval(self, cmd):
        self._reload_if_needed()
        output = self._repl.run_command(cmd)
        self._track_user_cmd(cmd)  # track only upon success
        return output

    def cmd_at(self, offset):
        cmds = self._history_cmds+self._user_cmds
        if len(cmds) == 0:
            return None, 0  # no cmds yet to reference
        index = offset
        if index < 0:
            index = len(cmds) + index
            if index < 0:
                # clamp to first item
                index = 0
                # offset equals length of cmds
                offset = -len(cmds)
        elif index >= 0:
            return None, 0  # the future is not the history

        return cmds[index].rstrip(), offset

    def close(self):
        self._persist_history_user_cmds()

    def _load_history_user_cmds(self):
        if not self._history_fp:
            return
        try:
            with open(self._history_fp, "r") as history_file:
                self._history_cmds = [
                    line for line in history_file.readlines() if line.strip()]
        except FileNotFoundError:
            # it's fine if no history file is yet there, might be first time we open this app
            self._history_cmds = []

    def _persist_history_user_cmds(self):
        if not self._history_fp:
            return
        with open(self._history_fp, "a+") as history_file:
            for cmd in self._user_cmds:
                line = cmd
                if not line.endswith('\r\n'):
                    line += '\r\n'
                history_file.write(line)
        # move user cmds to history cmds, so we do not persist them again
        self._history_cmds.extend(self._user_cmds)
        self._user_cmds = []

    def _track_user_cmd(self, cmd):
        if not cmd:
            return  # do not track empties
        for line in cmd.splitlines():
            if not line:
                continue  # do not track empties
            if self._user_cmds:
                if self._user_cmds[-1].strip() == line.strip():
                    continue  # do not track duplicates
            elif self._history_cmds:
                if self._history_cmds[-1].strip() == line.strip():
                    continue  # do not track duplicates
            self._user_cmds.append(line)

    def _reload_if_needed(self):
        mtime = self._polyfill_src_mtime()
        if mtime <= self._polyfill_src_mtime_latest:
            return  # nothing to do
        # reload codebase
        self._repl = self._repl_new()
        # update src mtime
        self._polyfill_src_mtime_latest = mtime

    def _polyfill_src_mtime(self):
        out_mtime = self._polyfill_src_mtime_latest
        for polyfill_py_path in glob.glob(self._PY_PATH_GOB):
            mtime = os.path.getmtime(polyfill_py_path)
            if mtime > out_mtime:
                out_mtime = mtime
        # return most late time
        return out_mtime

    def _repl_new(self):
        repl = replwrap.python()
        # replay all successfull commands so far
        for cmd in chain(self._prelude_cmds, self._user_cmds):
            output = repl.run_command(cmd)
        # return init REPL
        return repl


def serve_repl_main(repl, port):
    sio = socketio.AsyncServer()
    app = web.Application()
    sio.attach(app)

    @ sio.event
    def connect(sid, environ):
        print(f'connection established: {sid}')

    @ sio.event
    def eval(sid, data):
        try:
            return repl.eval(data['cmd'])
        except ValueError as e:
            if 'Continuation prompt found' in str(e):
                # ignore expected multiline-line related error
                return ''
            else:
                return str(e)
        except Exception as e:
            return str(e)

    @ sio.event
    def disconnect(sid):
        print(f'disconnected from server: {sid}')

    web.run_app(
        app,
        port=port,
    )


def run_repl(history_fp=None):
    with REPL(history_fp=history_fp) as repl:
        run_repl_main(repl)


def run_repl_main(repl):
    prompt = ">>>"
    history_offset = 0

    def write_stdout(txt, flush=True):
        sys.stdout.write(txt)
        if flush:
            sys.stdout.flush()

    def clear_stdout_line(flush=True):
        write_stdout('\033[2K\033[1G', flush=flush)

    def clear_last_char(flush=True):
        write_stdout('\b \b', flush)

    def reset_prompt(line):
        clear_stdout_line(flush=False)
        write_stdout(f"{prompt} ", flush=False)
        if line is not None:
            write_stdout(line)

    line = None

    def clear_env():
        nonlocal line
        nonlocal history_offset
        nonlocal prompt

        line = None
        history_offset = 0  # reset
        prompt = ">>>"
        write_stdout(f"{prompt} ")  # prompt

    clear_env()
    while True:
        try:
            c = click.getchar()
        except EOFError:
            print()
            print("Bye!")
            exit(0)
        except KeyboardInterrupt:
            # reset, life-saver
            clear_stdout_line(flush=False)
            clear_env()
            continue
        if c == '\x1b[A':  # up arrow
            current_line, history_offset = repl.cmd_at(history_offset-1)
            reset_prompt(current_line)
            if line:
                if line.endswith('\r\n'):
                    line += ' '
                lines = line.splitlines()
                if current_line:
                    lines[-1] = current_line
                else:
                    lines.pop()
                line = '\r\n'.join(lines)
            else:
                line = current_line
            continue
        elif c == '\x1b[B':  # down arrow
            current_line, history_offset = repl.cmd_at(history_offset+1)
            reset_prompt(current_line)
            if line:
                if line.endswith('\r\n'):
                    line += ' '
                lines = line.splitlines()
                if current_line:
                    lines[-1] = current_line
                else:
                    lines.pop()
                line = '\r\n'.join(lines)
            else:
                line = current_line
            continue
        elif c in ['\x1b[C', '\x1b[D']:
            # ignore left/right arrows for now,
            # they would behave unexpected in the current codebase anyhow,
            # and I do not have the energy to fix this properly for now,
            # sorry, feel free to fix it and open an MR for me if you care
            continue
        else:  # regular stdin
            if c == '\r':
                if line is None:
                    clear_stdout_line(flush=False)
                    clear_env()
                    continue  # restart
                write_stdout('\r\n')
                line += '\r\n'
            elif c in ['\b', '\x7f']:
                if line and line[-1] != '\n':
                    clear_last_char()
                    line = line[:len(line)-1]
                continue  # and now the next char please...
            else:
                line = (line or "") + str(c)
                write_stdout(str(c))
                # ^ write captured char
                try:
                    # we do not wish to use sys.stdin.readline()
                    # as that can capture our special back-keys :(
                    to_start = False
                    while True:
                        c = click.getchar()
                        if c == '\r':
                            write_stdout('\r\n')
                            line += '\r\n'
                            break
                        if c in ['\b', '\x7f']:
                            if line and line[-1] != '\n':
                                clear_last_char()
                                line = line[:len(line)-1]
                        elif c == '\x1b[A':  # up arrow, disabled in multiline mode
                            current_line, history_offset = repl.cmd_at(
                                history_offset-1)
                            reset_prompt(current_line)
                            if line:
                                if line.endswith('\r\n'):
                                    line += ' '
                                lines = line.splitlines()
                                if current_line:
                                    lines[-1] = current_line
                                else:
                                    lines.pop()
                                line = '\r\n'.join(lines)
                            else:
                                line = current_line
                            to_start = True
                            break
                        elif c == '\x1b[B':  # down arrow, disabled in multiline mode
                            current_line, history_offset = repl.cmd_at(
                                history_offset+1)
                            reset_prompt(current_line)
                            if line:
                                if line.endswith('\r\n'):
                                    line += ' '
                                lines = line.splitlines()
                                if current_line:
                                    lines[-1] = current_line
                                else:
                                    lines.pop()
                                line = '\r\n'.join(lines)
                            else:
                                line = current_line
                            continue
                            to_start = True
                            break
                        elif c in ['\x1b[C', '\x1b[D']:
                            # ignore left/right arrows for now,
                            # they would behave unexpected in the current codebase anyhow,
                            # and I do not have the energy to fix this properly for now,
                            # sorry, feel free to fix it and open an MR for me if you care
                            continue
                        else:
                            write_stdout(str(c))
                            line += str(c)
                    if to_start:
                        continue
                except KeyboardInterrupt:
                    # reset, life-saver
                    clear_stdout_line(flush=False)
                    clear_env()
                    continue
                if not line:
                    line = None
                    continue  # simply continue
        slines = line.splitlines()
        if len(slines) > 1 and slines[-1] != '':
            # multiline input requires 2 new lines, one to confirm
            write_stdout(f"{prompt} ")
            continue
        try:
            try:
                output = repl.eval(line)
            except ValueError as e:
                if 'Continuation prompt found' in str(e):
                    # ignore expected multiline-line related error
                    output = ''
                else:
                    raise e
            if output:
                if output.splitlines()[-1].startswith('IndentationError:'):
                    prompt = "..."
                    write_stdout(f"{prompt} ")
                    history_offset = 0  # reset
                    continue
                print(output.strip())
            # clear env
            clear_env()
        except Exception as e:
            print(e)
            traceback.print_tb(e.__traceback__)
            exit(1)


@click.group()
def cli():
    pass


@cli.command()
@click.option('--port', help='use a predefined port instead of a random available one')
def serve(port):
    if not port:
        port = find_free_port()
    with REPL() as repl:
        serve_repl_main(repl, port)


@cli.command()
@click.option('--history', default=os.path.join(Path.home(), '.js2py_py_repl_history'),
              help='file path to the history file to be used (local REPL mode only)')
def repl(history):
    # run as interactive local REPL
    run_repl(history_fp=history)


if __name__ == "__main__":
    cli()
