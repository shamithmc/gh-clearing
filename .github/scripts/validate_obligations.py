import os
import sys
import re
import json
import subprocess
from fnmatch import fnmatch

def run_cmd(args):
    result = subprocess.run(args, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(args)}\nStderr: {result.stderr}")
    return result.stdout.strip()

def parse_front_matter(content):
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n", content, re.DOTALL)
    if not match:
        return None
    fm_text = match.group(1)
    fm = {}
    current_key = None
    for line in fm_text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("-"):
            if current_key and isinstance(fm.get(current_key), list):
                val = stripped[1:].strip().strip('"').strip("'")
                fm[current_key].append(val)
        else:
            if ":" in line:
                key, val = line.split(":", 1)
                key = key.strip()
                val = val.strip()
                if val == "":
                    fm[key] = []
                    current_key = key
                elif val.startswith("[") and val.endswith("]"):
                    items = [item.strip().strip('"').strip("'") for item in val[1:-1].split(",") if item.strip()]
                    fm[key] = items
                    current_key = None
                else:
                    fm[key] = val.strip('"').strip("'")
                    current_key = None
    return fm

def get_current_branch():
    github_head_ref = (
        os.environ.get("WORK_UNIT_BRANCH")
        or os.environ.get("GITHUB_HEAD_REF")
    )
    if github_head_ref:
        return github_head_ref
    try:
        return run_cmd(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    except Exception:
        return "main"

def get_changed_files():
    # In GitHub Actions, compare with origin/main
    try:
        # Get list of changed files relative to main branch
        files = run_cmd(["git", "diff", "--name-only", "origin/main...HEAD"]).splitlines()
        return [f.strip() for f in files if f.strip()]
    except Exception as e:
        print(f"Warning: Failed to run git diff against origin/main. Fallback to local diff: {e}")
        try:
            files = run_cmd(["git", "diff", "--name-only", "HEAD~1"]).splitlines()
            return [f.strip() for f in files if f.strip()]
        except Exception:
            return []

def main():
    current_branch = get_current_branch()
    if current_branch == "main":
        print("Running on main branch, skipping obligations validation.")
        sys.exit(0)

    # Coverage decisions require an authoritative comparison with main.
    run_cmd(["git", "fetch", "--prune", "origin"])

    # 1. Load obligations.json
    obligations_path = "obligations.json"
    if not os.path.exists(obligations_path):
        print(f"Error: Missing obligations manifest at '{obligations_path}'")
        sys.exit(1)
    with open(obligations_path, "r", encoding="utf-8") as f:
        ob_data = json.load(f)
    
    obligations_map = {ob["invariant_id"]: ob for ob in ob_data.get("obligations", [])}

    # 2. Get changed files
    changed_files = get_changed_files()
    print(f"Changed files in PR: {changed_files}")

    # Find active task file
    task_files = [f for f in os.listdir("tasks") if f.endswith(".md")] if os.path.exists("tasks") else []
    matched_files = [
        f for f in task_files
        if current_branch in f
        or f.replace("task-", "").replace(".md", "") in current_branch
    ]

    if len(matched_files) > 1:
        print(
            f"Error: Expected exactly one task matching branch "
            f"'{current_branch}', found {matched_files}"
        )
        sys.exit(1)
    
    deleted_task_file = False
    content = ""
    
    if not matched_files:
        # Check if the task file was deleted on this branch (either created on main or created on this branch)
        try:
            deleted_files = run_cmd(["git", "log", "--diff-filter=D", "--name-only", "--pretty=format:"]).splitlines()
            deleted_tasks = [f.strip() for f in deleted_files if f.strip().startswith("tasks/") and f.strip().endswith(".md")]
            try:
                main_tasks_str = run_cmd(["git", "ls-tree", "-r", "--name-only", "origin/main", "tasks"])
                deleted_tasks.extend([f.strip() for f in main_tasks_str.splitlines() if f.strip().endswith(".md")])
            except Exception:
                pass
                
            deleted_tasks = list(set(deleted_tasks))
            matched_deleted = [f for f in deleted_tasks if current_branch in os.path.basename(f) or os.path.basename(f).replace("task-", "").replace(".md", "") in current_branch]
            
            if matched_deleted:
                task_path = matched_deleted[0]
                task_filename = os.path.basename(task_path)
                print(f"Task file '{task_filename}' was deleted on this branch (closing task). Loading from git history.")
                commit = run_cmd(["git", "log", f"origin/{current_branch}", "--full-history", "-1", "--format=%H", "--diff-filter=AM", "--", task_path]).strip()
                if not commit:
                    commit = "origin/main"
                content = run_cmd(["git", "show", f"{commit}:{task_path}"])
                matched_files = [task_filename]
                deleted_task_file = True
        except Exception as e:
            print(f"Error checking deleted task file: {e}")
            sys.exit(1)

    if not matched_files:
        print(f"Error: No task file found matching branch '{current_branch}'. Run task validation first.")
        sys.exit(1)

    if not deleted_task_file:
        task_path = os.path.join("tasks", matched_files[0])
        with open(task_path, "r", encoding="utf-8") as f:
            content = f.read()
            
    fm = parse_front_matter(content)
    
    if not fm or "paths" not in fm or "invariants" not in fm:
        print("Error: Task file missing paths or invariants.")
        sys.exit(1)

    claimed_paths = set(fm["paths"])
    task_invariants = fm["invariants"]

    # 3. Check that every modified file is declared in the task paths.
    for f in changed_files:
        if f not in claimed_paths:
            print(f"Error: File '{f}' was modified but is NOT listed in the task's 'paths' claim.")
            sys.exit(1)

    # 4. Check that every task invariant maps to a test file in obligations.json
    for inv in task_invariants:
        if inv not in obligations_map:
            print(f"Error: Invariant '{inv}' claimed by task is NOT listed in 'obligations.json'.")
            sys.exit(1)
        
        ob_entry = obligations_map[inv]
        test_path = ob_entry["test_path"]
        
        # Verify that the test path exists (or is being created in this task)
        # Note: If the test file is being created in the PR, it will be in changed_files
        if not os.path.exists(test_path) and test_path not in changed_files:
            print(f"Error: Obligation test file '{test_path}' for invariant '{inv}' does not exist.")
            sys.exit(1)

    # 5. Every changed path must be linked by the manifest to at least one
    # invariant actively claimed by this task.
    for f in changed_files:
        linked = []
        for inv in task_invariants:
            entry = obligations_map[inv]
            patterns = entry.get("path_patterns", [])
            if any(fnmatch(f, pattern) for pattern in patterns):
                linked.append(inv)
        if not linked:
            print(
                f"Error: Changed path '{f}' is not linked by obligations.json "
                "to any invariant claimed by this task."
            )
            sys.exit(1)

    print("Obligations manifest and coverage validation PASSED.")

if __name__ == "__main__":
    main()
