@echo off
setlocal

python --version >nul 2>nul
if %errorlevel% equ 0 set "REPO_PYTHON=python"
if defined REPO_PYTHON goto run

py -3 --version >nul 2>nul
if %errorlevel% equ 0 set "REPO_PYTHON=py -3"
if defined REPO_PYTHON goto run

wsl python3 --version >nul 2>nul
if %errorlevel% equ 0 set "REPO_PYTHON=wsl python3"
if defined REPO_PYTHON goto run

echo Python 3 is required. Install it or enable WSL with python3.
exit /b 1

:run
call :python -m unittest discover .github/scripts/tests || exit /b 1
call :python .github/scripts/validate_work_unit.py || exit /b 1
call :python .github/scripts/validate_gate_config.py || exit /b 1
call :python .github/scripts/validate_codeowners.py || exit /b 1
call :python .github/scripts/validate_topology.py || exit /b 1
call :python .github/scripts/validate_dependencies.py || exit /b 1
call :python .github/scripts/validate_obligations.py || exit /b 1
call :python .github/scripts/validate_schema_provenance.py || exit /b 1
echo Repository governance validation PASSED.
exit /b 0

:python
%REPO_PYTHON% %*
exit /b %errorlevel%
