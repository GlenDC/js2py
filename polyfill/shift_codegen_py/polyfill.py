"""
Polyfill code used to emulate JS behavior
when running JS2PY code.

```python
from shift_codegen_py import polyfill
scope = polyfill.GlobalScope()
scope.lookup("console")["log"].call(scope, "Hello, World!!")
# Hello, World!!
```
"""

import warnings
import sys

from collections.abc import Sequence


class SyntaxError(Exception):
  """
  an Uncaught JS-style SyntaxError
  """


class TypeError(Exception):
  """
  an Uncaught JS-style TypeError
  """


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


class GlobalScope(Scope):
  def __init__(self):
    super().__init__()

    # define console object
    self.declare_var('console', JSConsole())


# TODO:
# - support unary operations
# - support binary operations
# - add unit tests
# - support automated linting


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


class JSUndefined(JSObject):
  def __init__(self, *args, **kwargs):
    super().__init__(*args, **kwargs)

  def __setitem__(self, name, value):
    raise TypeError("Cannot set property '{name}' of undefined")

  def __getitem__(self, name):
    raise TypeError("Cannot read property '{name}' of undefined")


class JSBool(JSObject):
  def __init__(self, value, *args, **kwargs):
    super().__init__(*args, **kwargs)
    # TODO do we need value casting here?
    self._value = value


class JSNumber(JSObject):
  def __init__(self, value, *args, **kwargs):
    super().__init__(*args, **kwargs)
    # TODO do we need value casting here?
    self._value = value


class JSNaN(JSNumber):
  def __init__(self, *args, **kwargs):
    super().__init__(float('nan'), *args, **kwargs)


class JSInfinity(JSNumber):
  def __init__(self, *args, **kwargs):
    super().__init__(float('+Inf'), *args, **kwargs)


class JSString(JSObject):
  def __init__(self, value, *args, **kwargs):
    super().__init__(*args, **kwargs)
    # TODO do we need value casting here?
    self._value = value


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



class JSFunction(JSObject):
  """
  NOTE: in order to create anonymous functions,
  we can simply declare them using a random identifier,
  and not add them to the scope, given we do not use random identifiers,
  something like `__lambda_DE09030AEF` :) Ugly but it should work with our current setup.
  """

  def __init__(self, fn, parameters=None, *args, owner=None, **kwargs):
    super().__init__(*args, **kwargs)
    self._fn = fn
    self._parameters = parameters or []
    self._owner = owner

  def call(self, scope, *args):
    fn_scope = FunctionScope(scope, self._parameters, args, owner=self._owner)
    return self._fn(fn_scope)


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
