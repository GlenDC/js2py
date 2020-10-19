# JS-like exceptions.
from .errors import *

# JS Objects (including primitives) and scoping types.
from .runtime import *

# JS Switch Polyfill logic.
from .switch import *

# Objects expected that they might as well be built-in,
# such as console and window.
from .std import *

# Global Scope Object
from .globals import scope  # declares the scope global var
