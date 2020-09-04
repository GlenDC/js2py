"""
Polyfills to be able to simulate the global scope.
"""

from .runtime import Scope, JSUndefined, JSInfinity, JSNaN, JSNull
from .std import JSConsole


class GlobalScope(Scope):

  def __init__(self):
    super().__init__()

    # define protected builtins
    self._declare_reserved("null", JSNull())

    # define magic constant values
    self._declare_magic("undefined", JSUndefined())
    self._declare_magic("Infinity", JSInfinity())
    self._declare_magic("NaN", JSNaN())

    # browser-like std objects

    # define console object
    self.declare_var('console', JSConsole())  
