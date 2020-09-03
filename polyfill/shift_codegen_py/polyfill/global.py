"""
Polyfills to be able to simulate the global scope.
"""

from .runtime import Scope
from .std import JSConsole


class GlobalScope(Scope):
  def __init__(self):
    super().__init__()

    # define console object
    self.declare_var('console', JSConsole())
