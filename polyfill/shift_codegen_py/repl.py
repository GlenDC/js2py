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

repl = replwrap.python()

def push_and_read_eval(cmd):
  return repl.run_command(cmd)
# TODO: make hot reloading work
print(push_and_read_eval("import shift_codegen_py"))
print(push_and_read_eval("from shift_codegen_py.polyfill import *"))
print(push_and_read_eval("import importlib as PYTHON_STD_IMPORT_LIB"))

polyfill_py_last_modified_time = 0
polyfill_py_path_gob = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'polyfill', '*.py')

def hotreload_polyfill_library_if_desired():
  global polyfill_py_last_modified_time
  if not os.getenv('POLYFILL_HOT_RELOAD'):
    return  # nothing to do
  # reload the polyfill pkg if it was modified
  for polyfill_py_path in glob.glob(polyfill_py_path_gob):
    polyfill_py_last_modified_time_new = os.path.getmtime(polyfill_py_path)
    if polyfill_py_last_modified_time_new > polyfill_py_last_modified_time:
      cmds = [
        "PYTHON_STD_IMPORT_LIB.reload(shift_codegen_py)",
        "PYTHON_STD_IMPORT_LIB.reload(shift_codegen_py.polyfill)",
        # TODO: make hot reload work with our asterix usage here...
        "from shift_codegen_py.polyfill import *",
      ]
      for cmd in cmds:
        r = push_and_read_eval(cmd)
        if r and 'Exception' in r:
          return r
      polyfill_py_last_modified_time = polyfill_py_last_modified_time_new
      break
  
@sio.event
def connect(sid, environ):
  print('connection established')

@sio.event
def eval(sid, data):
  try:
    es = hotreload_polyfill_library_if_desired()
    if es:
      return es
    return push_and_read_eval(data['cmd'])
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
