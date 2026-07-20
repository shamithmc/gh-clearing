import os
import re
import sys
import subprocess

VALID_PROOFS = {"UNIT", "INTEGRATION", "CONFORMANCE", "COMPILER"}
VALID_INVARIANTS = {f"INV-{i:02d}" for i in range(1, 13)}

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
    try:
        # In GitHub Actions, GITHUB_HEAD_REF holds the branch name for PRs
        github_head_ref = os.environ.get("GITHUB_HEAD_REF")
        if github_head_ref:
            return github_head_ref
        return run_cmd(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    except Exception as e:
        print(f"Error getting branch: {e}")
        return "main"

def main():
    current_branch = get_current_branch()
    print(f"Current branch: {current_branch}")

    if current_branch == "main":
        print("Running on main branch, skipping work unit validation.")
        sys.exit(0)

    # Fetch remote to ensure we have all commits and branches
    try:
        run_cmd(["git", "fetch", "origin"])
    except Exception as e:
        print(f"Warning: Failed to fetch origin: {e}")

    # 1. Find the task file in tasks/
    task_files = [f for f in os.listdir("tasks") if f.endswith(".md")] if os.path.exists("tasks") else []
    matched_files = [f for f in task_files if current_branch in f or f.replace("task-", "").replace(".md", "") in current_branch]
    
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
            pass
            
    if not matched_files:
        print(f"Error: No task file in tasks/ matched current branch '{current_branch}'")
        sys.exit(1)
    
    if not deleted_task_file:
        task_filename = matched_files[0]
        task_path = os.path.join("tasks", task_filename)
        print(f"Validating task file: {task_path}")
        with open(task_path, "r", encoding="utf-8") as f:
            content = f.read()

    fm = parse_front_matter(content)
    if not fm:
        print("Error: Could not parse YAML front-matter from task file.")
        sys.exit(1)

    # Validate Schema
    required_fields = ["id", "title", "owner", "paths", "proof", "invariants"]
    for field in required_fields:
        if field not in fm:
            print(f"Error: Missing required field '{field}' in task front-matter.")
            sys.exit(1)

    if not fm["id"]:
        print("Error: 'id' field cannot be empty.")
        sys.exit(1)

    if not fm["owner"] or fm["owner"].lower() == "unassigned":
        print("Error: Task owner must be assigned (cannot be empty or 'unassigned').")
        sys.exit(1)

    if not isinstance(fm["paths"], list) or not fm["paths"]:
        print("Error: 'paths' must be a non-empty list of file paths.")
        sys.exit(1)

    if fm["proof"] not in VALID_PROOFS:
        print(f"Error: Invalid 'proof' kind '{fm['proof']}'. Must be one of {VALID_PROOFS}.")
        sys.exit(1)

    for inv in fm["invariants"]:
        if inv not in VALID_INVARIANTS:
            print(f"Error: Invalid invariant '{inv}'. Must be one of {VALID_INVARIANTS}.")
            sys.exit(1)

    print("Task front-matter schema validation PASSED.")
    my_paths = set(fm["paths"])
    print(f"My claimed paths: {my_paths}")

    # 2. Check path locks on other remote branches
    try:
        remote_branches = run_cmd(["git", "branch", "-r"]).splitlines()
        
        for ref in remote_branches:
            ref = ref.strip()
            if not ref or "origin/HEAD" in ref or f"origin/{current_branch}" in ref or "origin/main" in ref or "/pull/" in ref or "pull/" in ref or "/merge" in ref:
                continue
            
            branch_name = ref.replace("origin/", "")

            # Branches already merged (including squash-merged branches whose
            # commits have patch-equivalents on main) no longer own locks.
            cherry = subprocess.run(
                ["git", "cherry", "origin/main", ref],
                capture_output=True,
                text=True,
                check=False,
            )
            has_unique_commits = any(
                line.startswith("+") for line in cherry.stdout.splitlines()
            )
            if cherry.returncode == 0 and not has_unique_commits:
                continue
            
            # Only the task matching the remote branch represents that branch's
            # active lock. Other task files are inherited history.
            try:
                task_list_str = run_cmd(["git", "ls-tree", "-r", "--name-only", ref, "tasks"])
                other_task_files = [f for f in task_list_str.splitlines() if f.endswith(".md")]
                other_task_files = [
                    f for f in other_task_files
                    if branch_name in os.path.basename(f)
                    or os.path.basename(f).replace("task-", "").replace(".md", "") in branch_name
                ]
            except Exception:
                # No tasks directory on other branch
                continue

            for otf in other_task_files:
                try:
                    otf_content = run_cmd(["git", "show", f"{ref}:{otf}"])
                    otf_fm = parse_front_matter(otf_content)
                    if not otf_fm or "paths" not in otf_fm or "owner" not in otf_fm:
                        continue
                    
                    if otf_fm["owner"].lower() == "unassigned":
                        continue  # Not active/dispatched yet
                    
                    other_paths = set(otf_fm["paths"])
                    intersection = my_paths.intersection(other_paths)
                    if intersection:
                        print(f"Error: Path claim collision detected on branch '{branch_name}'.")
                        print(f"Other task file '{otf}' locks paths: {intersection}")
                        sys.exit(1)
                except Exception as e:
                    # Skip files that fail to load
                    continue

        print("Path-Claim Lock validation PASSED. No conflicts found.")
    except Exception as e:
        print(f"Warning/Error validating remote path-claims: {e}")
        # Don't fail if fetch fails, but log it
        pass

if __name__ == "__main__":
    main()
