import os
import sys
import json
import xml.etree.ElementTree as ET

def load_allowlist():
    allowlist_path = "dependency-allowlist.json"
    if not os.path.exists(allowlist_path):
        print(f"Error: Missing allowlist configuration at '{allowlist_path}'")
        sys.exit(1)
    with open(allowlist_path, "r", encoding="utf-8") as f:
        return json.load(f)

def validate_maven(allowlist):
    pom_path = "pom.xml"
    if not os.path.exists(pom_path):
        print("No pom.xml found. Skipping Maven dependency checks.")
        return True

    print(f"Validating Maven dependencies in {pom_path}...")
    try:
        # Register namespaces to parse correctly
        namespaces = {'maven': 'http://maven.apache.org/POM/4.0.0'}
        # Try parsing with and without namespace
        tree = ET.parse(pom_path)
        root = tree.getroot()
        
        # Check namespace
        ns = ""
        if root.tag.startswith("{"):
            ns = root.tag.split("}")[0] + "}"
        
        # Find all dependency elements
        dependencies = root.findall(f".//{ns}dependency")
        allowed_groups = set(allowlist.get("maven", {}).get("group_ids", []))
        allowed_artifacts = set(allowlist.get("maven", {}).get("artifact_ids", []))
        
        violations = []
        for dep in dependencies:
            group = dep.find(f"{ns}groupId")
            artifact = dep.find(f"{ns}artifactId")
            
            if group is not None and artifact is not None:
                g_val = group.text.strip()
                a_val = artifact.text.strip()
                
                # Check if group is in allowed groups OR the specific artifact is allowed
                # Note: To be secure, the artifact MUST be allowed and group MUST be allowed.
                # If they are not in the list, raise a violation.
                if g_val not in allowed_groups or a_val not in allowed_artifacts:
                    # Exception: Spring Boot starter test is typically allowed, check if it's there
                    if a_val == "spring-boot-starter-test" and g_val == "org.springframework.boot":
                        continue
                    violations.append(f"Maven Dependency Violation: {g_val}:{a_val} is not in the allowlist.")
        
        if violations:
            for v in violations:
                print(v)
            return False
            
        print("Maven dependency validation PASSED.")
        return True
    except Exception as e:
        print(f"Error parsing pom.xml: {e}")
        return False

def validate_npm(allowlist):
    pkg_path = "package.json"
    if not os.path.exists(pkg_path):
        print("No package.json found. Skipping npm dependency checks.")
        return True

    print(f"Validating npm dependencies in {pkg_path}...")
    try:
        with open(pkg_path, "r", encoding="utf-8") as f:
            pkg_data = json.load(f)
        
        allowed_deps = set(allowlist.get("npm", {}).get("dependencies", []))
        allowed_dev_deps = set(allowlist.get("npm", {}).get("dev_dependencies", []))
        
        violations = []
        
        # Check standard dependencies
        deps = pkg_data.get("dependencies", {})
        for d in deps:
            if d not in allowed_deps:
                violations.append(f"npm Dependency Violation: '{d}' is not in the allowlist.dependencies.")
                
        # Check dev dependencies
        dev_deps = pkg_data.get("devDependencies", {})
        for d in dev_deps:
            if d not in allowed_dev_deps and d not in allowed_deps:
                violations.append(f"npm Dev Dependency Violation: '{d}' is not in the allowlist.dev_dependencies.")
                
        if violations:
            for v in violations:
                print(v)
            return False
            
        print("npm dependency validation PASSED.")
        return True
    except Exception as e:
        print(f"Error parsing package.json: {e}")
        return False

def main():
    allowlist = load_allowlist()
    mvn_ok = validate_maven(allowlist)
    npm_ok = validate_npm(allowlist)
    
    if not mvn_ok or not npm_ok:
        print("Error: Dependency Allowlist Validation FAILED.")
        sys.exit(1)
        
    print("Dependency Allowlist Validation PASSED.")

if __name__ == "__main__":
    main()
