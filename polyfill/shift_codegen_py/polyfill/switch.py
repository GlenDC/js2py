"""
Polyfills Javascript's switch statement and all its bells.
"""

class JSSwitchExit(Exception):
  """
  Exception used to "break" out of a switch statement
  """

class JSSwitch:
  def __init__(self, condition):
    self.__condition = condition

  def __enter__(self):
    return self

  def __exit__(self, exc_type, exc_value, traceback):
    return exc_type is JSSwitchExit

  def case(self, *conditions):
    return self.__condition in conditions

"""
# Silly Show-it-all example:

def nt(x):
  description = ''
  with JSSwitch(x) as switch:
    if switch.case(8, 9, 10):
      return 'HIGH!!!'
    if switch.case(5, 6, 7):
      description += 'mid'
      raise JSSwitchExit()
    if switch.case(1, 2, 3, 4):
      description += 'low or '
    description += 'whatever'
  return description

# another horrible example using a classic I-Question:

def fizzbuzz(stop=30):
  for i in range(1, stop+1):
    output = ''
    with JSSwitch(0) as switch:
      if switch.case(i % 3):
        output += "fizz"
      if switch.case(i % 5):
        output += "buzz"
    print(output or i)
"""
