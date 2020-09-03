"""
Polyfills exception types as thrown in the Javascript Runtime.
"""

class SyntaxError(Exception):
  """
  an Uncaught JS-style SyntaxError
  """


class TypeError(Exception):
  """
  an Uncaught JS-style TypeError
  """
