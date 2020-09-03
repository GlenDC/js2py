"""
Polyfills Javascript objects such that operator
results can be simulated correctly as well as allowing
features that are otherwise not possible (e.g. postfix increment).

Also defines types in order to simulate the scoping rules,
including the hoisting concept, of Javascript
within the Python runtime.
"""

from collections.abc import Sequence

###############################################
####### OBJECTS
###############################################

# TODO:
# - support unary operations
# - support binary operations
# - add unit tests
# - support automated linting


# TODO:
# - validate that all operators work correctly
# - check if our JSNaN and JSInfinity can rely more on JSNumber for operators
# - check JSInfinity handles its sign correctly in its operators


class JSObject(object):
  def __init__(self, ref=None):
    self._properties = {}
    self.set_reference(ref)

  def set_reference(self, ref=None):
    self._ref = ref or 'undefined'

  def __setitem__(self, name, value):
    self._properties[name] = value

  def __getitem__(self, name):
    try:
      return self._properties[name]
    except KeyError:
      return JSUndefined()

  def __delitem__(self, name):
    try:
      del self._properties[name]
    except KeyError:
      pass

  def call(self, *args):
    raise TypeError(f"{self._ref} is not a function")

  # Str representation,
  # important when for example adding with a string

  def __repr__(self):
    return self.__str__()

  def __str__(self):
    return "[object Object]"

  # Bool representation
  
  def __bool__(self):
    return True

  # Number representation
  
  def __float__(self):
    return JSNaN()

  # Unary Operators

  def __neg__(self):
    return JSNaN()

  def __pos__(self):
    return JSNaN()

  def __invert__(self):
    return JSNumber(-1)

  # Absolute value, in JSLand triggered via Math.abs

  def __abs__(self):
    return JSNaN()

  # Binary Operators

  def __add__(self, other):
    return str(self) + str(other)

  def __radd__(self, other):
    return self + other

  def __iadd__(self, other):
    return self + other

  def __sub__(self, other):
    return JSNaN()

  def __rsub__(self, other):
    return self - other

  def __isub__(self, other):
    return self - other

  def __mul__(self, other):
    return JSNaN()

  def __rmul__(self, other):
    return self * other

  def __imul__(self, other):
    return self * other

  def __truediv__(self, other):
    return JSNaN()

  def __rtruediv__(self, other):
    return self / other

  def __itruediv__(self, other):
    return self / other

  # Javascript has no floor div

  def __mod__(self, other):
    return JSNaN()

  def __rmod__(self, other):
    return self % other

  def __imod__(self, other):
    return self % other

  def __pow__(self, other):
    return JSNaN()

  def __rpow__(self, other):
    return self % other

  def __ipow__(self, other):
    return self % other

  # Binary bitwise operators

  def __and__(self, other):
    return JSNumber(0)

  def __rand__(self, other):
    return self & other

  def __iand__(self, other):
    return self & other

  def __or__(self, other):
    return JSNumber(0) | other

  def __ror__(self, other):
    return self | other

  def __ior__(self, other):
    return self | other

  def __xor__(self, other):
    return JSNumber(0) ^ other

  def __rxor__(self, other):
    return self ^ other

  def __ixor__(self, other):
    return self ^ other

  def __lshift__(self, other):
    return JSNumber(0) << other

  def __rlshift__(self, other):
    return self << other

  def __ilshift__(self, other):
    return self << other

  def __rshift__(self, other):
    return JSNumber(0) >> other

  def __rrshift__(self, other):
    return self >> other

  def __irshift__(self, other):
    return self >> other

  # Binary logic operators

  def __eq__(self, other):
    return id(self) == id(other)

  def __neq__(self, other):
    return id(self) != id(other)

  def __gt__(self, other):
    return JSBool(False)

  def __lt__(self, other):
    return JSBool(False)

  def __ge__(self, other):
    return self == other

  def __le__(self, other):
    return self == other


class JSUndefined(JSObject):
  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)

  def __setitem__(self, name, value):
    raise TypeError("Cannot set property '{name}' of undefined")

  def __getitem__(self, name):
    raise TypeError("Cannot read property '{name}' of undefined")

  def __str__(self):
    return "undefined"
  
  def __bool__(self):
    return False


class JSBool(JSObject):
  def __init__(self, value, *args, **kwargs):
    super().__init__(*args, **kwargs)
    # TODO do we need value casting here?
    self._value = value

  def __str__(self):
    return "true" if self._value else "false"

  def __repr__(self):
    return self.__str__()

  def __str__(self):
    return "[object Object]"

  # Bool representation
  
  def __bool__(self):
    return self._value

  def __float__(self):
    return 1.0 if self._value else 0.0

  # Unary Operators

  def __neg__(self):
    return JSNaN()

  def __pos__(self):
    return JSNaN()

  def __invert__(self):
    return JSNumber(-1)

  # Absolute value, in JSLand triggered via Math.abs

  def __abs__(self):
    return JSNaN()

  # Binary Operators

  def __add__(self, other):
    return JSNumber(int(self._value)) + other

  def __radd__(self, other):
    return self + other

  def __iadd__(self, other):
    return self + other

  def __sub__(self, other):
    return JSNumber(int(self._value)) - other

  def __rsub__(self, other):
    return self - other

  def __isub__(self, other):
    return self - other

  def __mul__(self, other):
    return JSNumber(int(self._value)) * other

  def __rmul__(self, other):
    return self * other

  def __imul__(self, other):
    return self * other

  def __truediv__(self, other):
    return JSNumber(int(self._value)) / other

  def __rtruediv__(self, other):
    return self / other

  def __itruediv__(self, other):
    return self / other

  # Javascript has no floor div

  def __mod__(self, other):
    return JSNumber(int(self._value)) % other

  def __rmod__(self, other):
    return self % other

  def __imod__(self, other):
    return self % other

  def __pow__(self, other):
    return JSNumber(int(self._value)) ** other

  def __rpow__(self, other):
    return self % other

  def __ipow__(self, other):
    return self % other

  # Binary bitwise operators

  def __and__(self, other):
    return JSNumber(int(self._value)) & other

  def __rand__(self, other):
    return self & other

  def __iand__(self, other):
    return self & other

  def __or__(self, other):
    return JSNumber(int(self._value)) | other

  def __ror__(self, other):
    return self | other

  def __ior__(self, other):
    return self | other

  def __xor__(self, other):
    return JSNumber(int(self._value)) ^ other

  def __rxor__(self, other):
    return self ^ other

  def __ixor__(self, other):
    return self ^ other

  def __lshift__(self, other):
    return JSNumber(int(self._value)) << other

  def __rlshift__(self, other):
    return self << other

  def __ilshift__(self, other):
    return self << other

  def __rshift__(self, other):
    return JSNumber(int(self._value)) >> other

  def __rrshift__(self, other):
    return self >> other

  def __irshift__(self, other):
    return self >> other

  # Binary logic operators

  def __eq__(self, other):
    return self._value == bool(other)

  def __neq__(self, other):
    return self._value != bool(other)

  def __gt__(self, other):
    return JSNumber(int(self._value)) > other

  def __lt__(self, other):
    return JSNumber(int(self._value)) < other

  def __ge__(self, other):
    return JSNumber(int(self._value)) >= other

  def __le__(self, other):
    return JSNumber(int(self._value)) <= other


class JSNumber(JSObject):
  def __init__(self, value, *args, **kwargs):
    super().__init__(*args, **kwargs)
    # no casting is required here,
    # other functions / transpiler should ensure value is valid here
    self._value = float(value)

  def __str__(self):
    s = str(self._value)
    if '.' in s:
      s = s.rstrip("0").rstrip(".")
    return s

  def __float__(self):
    return self._value

  # Bool representation
  
  def __bool__(self):
    return self._value != ""

  # Unary Operators

  def __neg__(self):
    return JSNumber(-1)

  def __pos__(self):
    if bool(self):
      return JSNaN()
    return JSNumber(0)

  def __invert__(self):
    if bool(self):
      return JSNaN()
    return JSNumber(-0)

  # Absolute value, in JSLand triggered via Math.abs

  def __abs__(self):
    return JSNaN()

  # Binary Operators

  def __add__(self, other):
    if isinstance(other, JSString):
      return str(self) + str(other)
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    return JSNumber(self._value + f)

  def __radd__(self, other):
    return self + other

  def __iadd__(self, other):
    if isinstance(other, JSString):
      return str(self) + str(other)
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    self._value += f
    return self

  def __sub__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    return JSNumber(self._value - f)

  def __rsub__(self, other):
    return self - other

  def __isub__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    self._value -= f
    return self

  def __mul__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    return JSNumber(self._value * f)

  def __rmul__(self, other):
    return self * other

  def __imul__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    self._value *= f
    return self

  def __truediv__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    return JSNumber(self._value / f)

  def __rtruediv__(self, other):
    return self / other

  def __itruediv__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    self._value /= f
    return self

  # Javascript has no floor div

  def __mod__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    return JSNumber(self._value % f)

  def __rmod__(self, other):
    return self % other

  def __imod__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    self._value %= f
    return self

  def __pow__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    return JSNumber(self._value ** f)

  def __rpow__(self, other):
    return self % other

  def __ipow__(self, other):
    return self % other

  # Binary bitwise operators

  def __and__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    return JSNumber(self._value & f)

  def __rand__(self, other):
    return self & other

  def __iand__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    self._value &= f
    return self

  def __or__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    return JSNumber(self._value | f)

  def __ror__(self, other):
    return self | other

  def __ior__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    self._value |= f
    return self

  def __xor__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    return JSNumber(self._value ^ f)

  def __rxor__(self, other):
    return self ^ other

  def __ixor__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return JSNaN()
    self._value ^= f
    return self

  def __lshift__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return self
    return JSNumber(self._value << f)

  def __rlshift__(self, other):
    return self << other

  def __ilshift__(self, other):
    f = float(other)
    if not isinstance(f, JSNaN):
      self._value <<= f
    return self

  def __rshift__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return self
    return JSNumber(self._value >> f)

  def __rrshift__(self, other):
    return self >> other

  def __irshift__(self, other):
    f = float(other)
    if not isinstance(f, JSNaN):
      self._value >>= f
    return self

  # Binary logic operators

  def __eq__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return False
    return self._value == f

  def __neq__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return True
    return self._value != f

  def __gt__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return False
    return self._value > f

  def __lt__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return False
    return self._value < f

  def __ge__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return False
    return self._value >= f

  def __le__(self, other):
    f = float(other)
    if isinstance(f, JSNaN):
      return False
    return self._value <= f


class JSNaN(JSNumber):
  def __init__(self, *args, **kwargs):
    super().__init__(float('nan'), *args, **kwargs)

  def __str__(self):
    return "NaN"

  def __float__(self):
    return self

  # Bool representation
  
  def __bool__(self):
    return False

  # Unary Operators

  def __neg__(self):
    return self

  def __pos__(self):
    return self

  def __invert__(self):
    return JSNumber(-1)

  # Absolute value, in JSLand triggered via Math.abs

  def __abs__(self):
    return JSNaN()

  # Binary Operators

  def __add__(self, other):
    if isinstance(other, JSString):
      return str(self) + str(other)
    return self

  def __radd__(self, other):
    return self + other

  def __iadd__(self, other):
    if isinstance(other, JSString):
      return str(self) + str(other)
    return self

  def __sub__(self, other):
    return self

  def __rsub__(self, other):
    return self - other

  def __isub__(self, other):
    return self

  def __mul__(self, other):
    return self

  def __rmul__(self, other):
    return self * other

  def __imul__(self, other):
    return self

  def __truediv__(self, other):
    return self

  def __rtruediv__(self, other):
    return self / other

  def __itruediv__(self, other):
    return self

  # Javascript has no floor div

  def __mod__(self, other):
    return self

  def __rmod__(self, other):
    return self % other

  def __imod__(self, other):
    return self

  def __pow__(self, other):
    return self

  def __rpow__(self, other):
    return self % other

  def __ipow__(self, other):
    return self % other

  # Binary bitwise operators

  def __and__(self, other):
    return JSNumber(0) & other

  def __rand__(self, other):
    return self & other

  def __iand__(self, other):
    return self & other

  def __or__(self, other):
    return JSNumber(0) | other

  def __ror__(self, other):
    return self | other

  def __ior__(self, other):
    return self | other

  def __xor__(self, other):
    return JSNumber(0) ^ other

  def __rxor__(self, other):
    return self ^ other

  def __ixor__(self, other):
    return self ^ other

  def __lshift__(self, other):
    return JSNumber(0) << other

  def __rlshift__(self, other):
    return self << other

  def __ilshift__(self, other):
    return self << other

  def __rshift__(self, other):
    return JSNumber(0) >> other

  def __rrshift__(self, other):
    return self >> other

  def __irshift__(self, other):
    return self >> other

  # Binary logic operators

  def __eq__(self, other):
      return False

  def __neq__(self, other):
    return True

  def __gt__(self, other):
      return False

  def __lt__(self, other):
      return False

  def __ge__(self, other):
    return self == other or self > other

  def __le__(self, other):
    return self == other or self < other


class JSInfinity(JSNumber):
  def __init__(self, *args, **kwargs):
    super().__init__(float('+Inf'), *args, **kwargs)

  def __str__(self):
    return "Infinity" if self._value == float("+Inf") else "-Infinity"

  def __float__(self):
    return self

  # Bool representation
  
  def __bool__(self):
    return False

  # Unary Operators

  def __neg__(self):
    r = JSInfinity()
    r._value = -self._value
    return r

  def __pos__(self):
    return self

  def __invert__(self):
    return JSNumber(-1)

  # Absolute value, in JSLand triggered via Math.abs

  def __abs__(self):
    return self

  # Binary Operators

  def __add__(self, other):
    if isinstance(other, JSString):
      return str(self) + str(other)
    return self

  def __radd__(self, other):
    return self + other

  def __iadd__(self, other):
    if isinstance(other, JSString):
      return str(self) + str(other)
    return self

  def __sub__(self, other):
    return JSNaN()

  def __rsub__(self, other):
    return self - other

  def __isub__(self, other):
    return JSNaN()

  def __mul__(self, other):
    return self

  def __rmul__(self, other):
    return self * other

  def __imul__(self, other):
    return self

  def __truediv__(self, other):
    return self

  def __rtruediv__(self, other):
    return self / other

  def __itruediv__(self, other):
    return self

  # Javascript has no floor div

  def __mod__(self, other):
    return self

  def __rmod__(self, other):
    return self % other

  def __imod__(self, other):
    return self

  def __pow__(self, other):
    return self

  def __rpow__(self, other):
    return self % other

  def __ipow__(self, other):
    return self % other

  # Binary bitwise operators

  def __and__(self, other):
    return JSNumber(0) & other

  def __rand__(self, other):
    return self & other

  def __iand__(self, other):
    return self & other

  def __or__(self, other):
    return JSNumber(0) | other

  def __ror__(self, other):
    return self | other

  def __ior__(self, other):
    return self | other

  def __xor__(self, other):
    return JSNumber(0) ^ other

  def __rxor__(self, other):
    return self ^ other

  def __ixor__(self, other):
    return self ^ other

  def __lshift__(self, other):
    return JSNumber(0) << other

  def __rlshift__(self, other):
    return self << other

  def __ilshift__(self, other):
    return self << other

  def __rshift__(self, other):
    return JSNumber(0) >> other

  def __rrshift__(self, other):
    return self >> other

  def __irshift__(self, other):
    return self >> other

  # Binary logic operators

  def __eq__(self, other):
      return False

  def __neq__(self, other):
    return True

  def __gt__(self, other):
      return False

  def __lt__(self, other):
      return False

  def __ge__(self, other):
    return self == other or self > other

  def __le__(self, other):
    return self == other or self < other


class JSString(JSObject):
  def __init__(self, value, *args, **kwargs):
    super().__init__(*args, **kwargs)
    # TODO do we need value casting here?
    self._value = value

  def __str__(self):
    return self._value

  def __bool__(self):
    return self._value != ""

  def __float__(self):
    return JSNaN() if self._value == "" else JSNumber(0)


class JSArray(JSObject):
  def __init__(self, values, *args, **kwargs):
    super().__init__(*args, **kwargs)
    if not isinstance(values, Sequence):
      raise RuntimeError(f"BUG: unexpected values object {values}; expected an Sequence object")
    self._values = values

  def __iter__(self):
    return self._values.__iter__()

  def __next__(self):
    return self._values.__next__()

  def __getitem__(self, index):
    try:
      self._values.__getitem__(index)
    except IndexError:
      return JSUndefined()

  def __len__(self):
    return self._values.__len__()

  def __contains__(self, value):
    return self._values.__contains__(value)

  def __reversed__(self):
    yield from self._values.__reversed__()

  def __setitem__(self, index, value):
    self._values.__setitem__(index, value)

  def __delitem__(self, index):
    self._values.__delitem__(index)

  def __iadd__(self, value):
    return self._values.__iadd__(value)

  def __add__(self, value):
    return self._values.__add__(value)

  def __str__(self):
    return ",".join(str(value) for value in self._values)


class JSFunction(JSObject):
  """
  NOTE: in order to create anonymous functions,
  we can simply declare them using a random identifier,
  and not add them to the scope, given we do not use random identifiers,
  something like `__lambda_DE09030AEF` :) Ugly but it should work with our current setup.
  """

  def __init__(self, fn, parameters=None, *args, owner=None, repr=None, **kwargs):
    super().__init__(*args, **kwargs)
    self._fn = fn
    self._parameters = parameters or []
    self._owner = owner
    self._repr = repr

  def call(self, scope, *args):
    fn_scope = FunctionScope(scope, self._parameters, args, owner=self._owner)
    return self._fn(fn_scope)

  def __str__(self):
    if self._repr:
      return self._repr
    return "function {self._ref if self._ref else ''}() {{ [native code] }}"


###############################################
####### Scope Types
###############################################

class Scope(object):
  """
  Scope is meant to help easier deal with how scoping
  works in Javascript in order to correctly work with references.

  Different references are:
  - var:
    - function-level scope;
    - if consequent block re-declaration of an existing var in the parent function level,
      will result in the variable being hoisted;
  - let:
    - block-level scope, thus also an if consequent block for example
    - raises an exception in case it is re-declared
  - const:
    - same as `let` but cannot be assigned once declared
  """

  __REF_KIND_VAR = 1
  __REF_KIND_LET = 2
  __REF_KIND_CONST = 3

  def __init__(self, parent_scope=None):
    self._parent_scope = parent_scope
    self._refs = {}

  def assign(self, name, value):
    """
    Reference the value using the name as reference,
    if no value was referenced using this name before it will
    implicitly be declared as if it were a `var`-scoped value.
    """
    try:
      return self._refs[name][1]
    except KeyError:
      # declare implicitly as a var, within the current scope
      self.declare_var(name, value)

  def lookup(self, name):
    """
    Return the value using the name as reference,
    None is returned in case no value could be found for
    the given name-as-reference.
    """
    try:
      return self._refs[name][1]
    except KeyError:
      return None if self._parent_scope is None else self._parent_scope.lookup(name)

  def declare_var(self, name, value):
    """
    Declare the value as a var, overwriting the reference if it
    already existed before.
    """
    stored_kind_value_pair = self.lookup(name)
    if stored_kind_value_pair:
      # we cannot check if it isn't a `var`, as we also would like this to work with `__REF_KIND_PARAM` :)
      if stored_kind_value_pair[0] in [self.__REF_KIND_LET, self.__REF_KIND_CONST]:
        raise SyntaxError(f"Identifier '{name}' has already been declared")
      # store value in original value, hoist as such
      stored_kind_value_pair[1] = value
    else:
      self._refs[name] = [self.__REF_KIND_VAR, value]

  def declare_let(self, name, value):
    """
    Declare the value as a let, raising an exception if it already exists.
    """
    if self.__exists(name):
      raise SyntaxError(f"Identifier '{name}' has already been declared")
    self._refs[name] = [self.__REF_KIND_LET, value]

  def declare_const(self, name, value):
    """
    Declare the value as a const, raising an exception if it already exists.
    """
    if self.__exists(name):
      raise SyntaxError(f"Identifier '{name}' has already been declared")
    self._refs[name] = [self.__REF_KIND_CONST, value]

  def __exists(self, name):
    """
    Check if a value exists within scope,
    only to be used within the internal API
    """
    try:
      self._refs[name]
      return True
    except KeyError:
      return False if self._parent_scope is None else self._parent_scope.exists(name)

class FunctionScope(Scope):
  """
  Pretty much the same as a regular Scope,
  except that a parent scope is required,
  and that parameters can be added,
  which are similar to vars except that they
  do not hoisted shadowed vars
  """
  __REF_KIND_PARAM = 10

  def __init__(self, parent_scope, parameters, arguments, owner=None):
    if parent_scope is None:
      raise RuntimeError("BUG: parent scope is required for Function Scope: cannot be undefined")
    super().__init__(parent_scope=parent_scope)
    self._arguments = JSArray(arguments)  # store all arguments, used using the arguments call
    for name, value in zip(parameters, arguments):  # only those arguments given are stored in scope by name, others will return undefined
      self._declare_param(name, value)
    self._owner = owner or JSUndefined()

  def _declare_param(self, name, value):
    # we can safely do this without checking anything,
    # given it will be right at the start,
    # and thus with an empty scope
    self._refs[name] = [self.__REF_KIND_PARAM, value]

  @property
  def this(self):
    return self._owner

  @property
  def arguments(self):
    return self._arguments


class BlockScope(Scope):
  """
  Pretty much the same as a regular Scope,
  except that vars are by defacto stored in the parent scope,
  and as such the parent scope is of course required
  """
  def __init__(self, parent_scope):
    if parent_scope is None:
      raise RuntimeError("BUG: parent scope is required for Block Scope: cannot be undefined")
    super().__init__(parent_scope=parent_scope)

    def declare_var(self, name, value):
      self._parent_scope.declare_var(name, value)
