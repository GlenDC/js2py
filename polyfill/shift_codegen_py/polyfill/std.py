"""
Polyfills standard Javascript objects used in browsers,
such as console and window.
"""

import warnings
import sys

from .runtime import Scope, JSObject, JSFunction


###############################################
# Standard (browser) environment objects
###############################################

class JSConsole(JSObject):
    def __init__(self):
        super().__init__()
        # print methods
        self["log"] = JSFunction(self.__log, ref="log", owner=self)
        self["warn"] = JSFunction(self.__warn, ref="warn", owner=self)
        self["error"] = JSFunction(self.__error, ref="error", owner=self)

    def __log(self, scope):
        print(*scope.arguments)

    def __warn(self, scope):
        warnings.warn(' '.join(scope.arguments), category=UserWarning)

    def __error(self, scope):
        print(*scope.arguments, file=sys.stderr)
