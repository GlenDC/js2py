import code
import sys
import json
import socketio
from contextlib import redirect_stdout
import io
from aiohttp import web

from shift_codegen_py.polyfill import *

sio = socketio.AsyncServer()
app = web.Application()
sio.attach(app)

console = code.InteractiveConsole(locals=locals())

stdoutBuffer = io.StringIO()

def push_and_read_eval(data):
  with redirect_stdout(stdoutBuffer):
    console.push(data)
  
@sio.event
def connect():
    print('connection established')

@sio.event
def my_message(data):
    message = json.loads(data)
    response = { 'cmd': message['cmd'] }
    if message['cmd'] == 'eval':
      response['input'] = data
      response['output'] = push_and_read_eval(message['data'])
    sio.emit()
    sio.emit('my response', {'response': 'my response'})

@sio.event
def disconnect():
    print('disconnected from server')

web.run_app(
  app,
  # TODO: allow port to be different
  port=5000,
)
