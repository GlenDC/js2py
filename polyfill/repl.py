import code
import sys

from shift_codegen_py.polyfill import *

console = code.InteractiveConsole(locals=locals())
for line in sys.stdin:
  console.push(line)
