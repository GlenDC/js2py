# JS-like exceptions.
from .errors import *

# JS Objects (including primitives) and scoping types.
from .runtime import *

# JS statements Polyfill code such as the switch.
from .statements import *

# Objects expected that they might as well be built-in,
# such as console and window.
from .std import *

# Global Scope Object
from .globals import scope  # declares the scope global var
