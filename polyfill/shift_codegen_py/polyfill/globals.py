"""
Polyfills to be able to simulate the global scope.
"""

from .runtime import Scope, JSUndefined, JSInfinity, JSNaN, JSNull, JSString, JSNumber, JSObject, jsfunc
from .std import JSConsole, JSMath

scope = Scope()

# define protected builtins
scope._declare_reserved("null", JSNull())

# define magic constant values
scope._declare_magic("undefined", JSUndefined())
scope._declare_magic("Infinity", JSInfinity())
scope._declare_magic("NaN", JSNaN())

# browser-like std objects
# TODO

# define global objects which are not protected by reference
scope.declare_var('console', JSConsole())
scope.declare_var('Math', JSMath())

########
# declare global functions


@jsfunc(scope, "isNaN", parameters=["x"])
def fn(scope):
    # TODO:
    # support:
    #   - dates are also NaN as long as they are actual DateInstances
    x = scope["x"]
    if isinstance(x, JSNumber) or isinstance(x, JSNull):
        return False
    if isinstance(x, JSString):
        if x.is_empty():
            return False
        return not isinstance(x.to_number(), JSNumber)
    return True  # NaN in all other cases


@jsfunc(scope, "eval", parameters=["script"])
def fn(scope):
    # TODO: check if this is all we need, seems a bit too good to be true
    x = scope["x"]
    try:
        return eval(x)
    except SyntaxError:
        exec(x)
        return None
