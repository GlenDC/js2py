"""
Polyfills standard Javascript objects used in browsers,
such as console and window.
"""

import warnings
import sys

from .runtime import Scope, JSObject, JSFunction, JSNumber


###############################################
# Standard (browser) environment objects
###############################################

class JSConsole(JSObject):
    # TODO: define representation better

    def __init__(self):
        super().__init__()
        # print methods
        self.assign("log", JSFunction(self.__log, ref="log", owner=self))
        self.assign("warn", JSFunction(self.__warn, ref="warn", owner=self))
        self.assign("error", JSFunction(self.__error, ref="error", owner=self))

    def __log(self, scope):
        print(*scope.arguments)

    def __warn(self, scope):
        warnings.warn(' '.join(scope.arguments), category=UserWarning)

    def __error(self, scope):
        print(*scope.arguments, file=sys.stderr)


class JSMath(JSObject):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # constants
        constants = {
            # Euler's constant and the base of natural logarithms; approximately 2.718.
            "E": "2.718281828459045",
            # Natural logarithm of 2; approximately 0.693.
            "LN2": "0.6931471805599453",
            # Natural logarithm of 10; approximately 2.303.
            "LN10": "2.302585092994046",
            # Base-2 logarithm of E; approximately 1.443.
            "LOG2E": "1.4426950408889634",
            # Base-10 logarithm of E; approximately 0.434.
            "LOG10E": "0.4342944819032518",
            # Ratio of the a circle's circumference to its diameter; approximately 3.14159.
            "PI": "3.141592653589793",
            # Square root of ½ (or equivalently, 1/√2); approximately 0.707.
            "SQRT1_2": "0.7071067811865476",
            # Square root of 2; approximately 1.414.
            "SQRT2": "1.4142135623730951",
        }
        for name, value in constants.items():
            self._magic_properties[name] = JSNumber(value)

    def __str__(self):
        return 'Object [Math] {}'

    def to_string(self):
        return 'Object [Math]'

    # TODO: define static methods
    # https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math#StaticMethods
