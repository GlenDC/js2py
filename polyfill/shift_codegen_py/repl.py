import sys
import json
import socketio
import io
from aiohttp import web

from pexpect import replwrap

from polyfill import *

sio = socketio.AsyncServer()
app = web.Application()
sio.attach(app)

repl = replwrap.python()

def push_and_read_eval(cmd):
  return repl.run_command(cmd)
  
@sio.event
def connect(sid, environ):
    print('connection established')

@sio.event
def eval(sid, data):
    try:
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
