from setuptools import setup, find_packages

setup(
  name='shift_codegen_py',
  version='0.1.0',
  description='Python JS-Polyfill library used as core dependency for any generated Python code using the NPM shift-codegen-py package.',
  url='https://github.com/GlenDC/js2py.git',
  author='Glen De Cauwsemaecker',
  author_email='contact@glendc.com',
  license='MIT',
  packages=find_packages(),
  zip_safe=False,
)
