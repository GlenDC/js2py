import code
import sys

# TODO: turn into the actual pkg
# TODO: somehow install it in a background virtual env of user's machine,
# that we can reuse between runs
from shift_codegen_py.polyfill import *

console = code.InteractiveConsole(locals=locals())
for line in sys.stdin:
  console.push(line)
