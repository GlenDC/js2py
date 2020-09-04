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

def find_free_port():
  # util functionality copied from
  # https://stackoverflow.com/a/45690594
  with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
    s.bind(('', 0))
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    return s.getsockname()[1]

class REPL:
  _PY_PATH_GOB = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'polyfill', '*.py')

  def __init__(self):
    # NOTE: replace _user_cmds with file if
    # we ever turn out to use too much memory by storing the cmds history in memory
    self._user_cmds = [
      # NOTE: implicitly relies on the fact that shift-codegen_py is installed
      # in a linked modus operandes
      "from shift_codegen_py.polyfill import *", # required first command
    ]
    self._user_cmds_start_index = 1
    self._repl = self._repl_new()
    self._polyfill_src_mtime_latest = 0
    self._polyfill_src_mtime_latest = self._polyfill_src_mtime()

  def eval(self, cmd):
    self._reload_if_needed()
    output = self._repl.run_command(cmd)
    self._persist_user_cmd(cmd)  # persist only upon success
    return output

  def cmd_at(self, offset):
    cmds = self._user_cmds[self._user_cmds_start_index:]
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

  def _persist_user_cmd(self, cmd):
    if not cmd:
      return  # do not persist empties
    for line in cmd.splitlines():
      if not line:
        continue  # do not persist empties
      if self._user_cmds[-1].strip() == line.strip():
        continue  # do not persist duplicates
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
    for cmd in self._user_cmds:
      output = repl.run_command(cmd)
    # return init REPL
    return repl

def serve_repl(port):
  repl = REPL()

  sio = socketio.AsyncServer()
  app = web.Application()
  sio.attach(app)

  @sio.event
  def connect(sid, environ):
    print(f'connection established: {sid}')

  @sio.event
  def eval(sid, data):
    try:
      return repl.eval(data['cmd'])
    except Exception as e:
      return str(e)

  @sio.event
  def disconnect(sid):
      print(f'disconnected from server: {sid}')

  web.run_app(
    app,
    port=port,
  )

def run_repl():
  repl = REPL()

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
        line = (line or "" ) + str(c)
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
              to_start = True
              break
            elif c == '\x1b[B':  # down arrow, disabled in multiline mode
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
      exit(1)

if __name__ == "__main__":
  args = sys.argv[1:]
  if len(args) > 0:
    # serve repl
    try:
      port = int(args[0])
    except ValueError:
      port = find_free_port()
    serve_repl(port)
  else:
    # run as interactive local REPL
    run_repl()
