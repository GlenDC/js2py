import sys
import json
import socketio
import io
import os
import glob
from aiohttp import web

from pexpect import replwrap

sio = socketio.AsyncServer()
app = web.Application()
sio.attach(app)

class REPL:
  _PY_PATH_GOB = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'polyfill', '*.py')

  def __init__(self):
    # NOTE: replace _user_cmds with file if
    # we ever turn out to use too much memory by storing the cmds history in memory
    self._user_cmds = [
      "from shift_codegen_py.polyfill import *", # required first command
    ]
    self._repl = self._repl_new()
    self._polyfill_src_mtime_latest = 0

  def eval(self, cmd):
    self._reload_if_needed()
    output = self._repl.run_command(cmd)
    self._persist_user_cmd(cmd)  # persist only upon success
    return output

  def _persist_user_cmd(self, cmd):
    self._user_cmds.append(cmd)

  def _reload_if_needed(self):
    mtime = self._polyfill_src_mtime()
    if mtime <= self._polyfill_src_mtime_latest:
      return  # nothing to do
    # reload codebase
    self._repl = self._repl_new()
    # update src mtime
    self._polyfill_src_mtime_latest = mtime

  def _polyfill_src_mtime(self):
    for polyfill_py_path in glob.glob(self._PY_PATH_GOB):
      mtime = os.path.getmtime(polyfill_py_path)
      if mtime > self._polyfill_src_mtime_latest:
        return mtime
    return self._polyfill_src_mtime_latest

  def _repl_new(self):
    repl = replwrap.python()
    # replay all successfull commands so far
    for cmd in self._user_cmds:
      output = repl.run_command(cmd)
    # return init REPL
    return repl

repl = REPL()
  
@sio.event
def connect(sid, environ):
  print('connection established')

@sio.event
def eval(sid, data):
  try:
    return repl.eval(data['cmd'])
  except Exception as e:
    return str(e)

@sio.event
def disconnect(sid):
    print('disconnected from server')

web.run_app(
  app,
  # TODO: allow port to be different
  port=5000,
)
