import json
import io
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path


SCRIPTS_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS_DIR))

import validate_dependencies
import validate_topology


class working_directory:
    def __init__(self, path):
        self.path = path
        self.previous = None

    def __enter__(self):
        self.previous = Path.cwd()
        os.chdir(self.path)

    def __exit__(self, exc_type, exc_value, traceback):
        os.chdir(self.previous)


class DependencyAllowlistTest(unittest.TestCase):
    def test_test_starter_requires_explicit_allowlist_entry(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "backend").mkdir()
            (root / "backend/pom.xml").write_text(
                """<project xmlns="http://maven.apache.org/POM/4.0.0">
                <dependencies><dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-starter-test</artifactId>
                </dependency></dependencies></project>""",
                encoding="utf-8",
            )
            allowlist = {
                "maven": {
                    "group_ids": ["org.springframework.boot"],
                    "artifact_ids": [],
                }
            }
            with working_directory(root):
                with redirect_stdout(io.StringIO()):
                    rejected = validate_dependencies.validate_maven(allowlist)
                self.assertFalse(rejected)
                allowlist["maven"]["artifact_ids"].append("spring-boot-starter-test")
                with redirect_stdout(io.StringIO()):
                    accepted = validate_dependencies.validate_maven(allowlist)
                self.assertTrue(accepted)


class TopologyReconciliationTest(unittest.TestCase):
    def test_mismatch_fails_reconciliation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "backend/src/main/resources/deploy").mkdir(parents=True)
            (root / "backend/src/main/resources/application.yml").write_text(
                "strategy: DISCRIMINATOR_COLUMN\ndiscriminator-field: tenant_id\n",
                encoding="utf-8",
            )
            (root / "docker-compose.yml").write_text(
                "image: postgres:16-alpine\nPOSTGRES_DB: gh_clearing\n",
                encoding="utf-8",
            )
            (root / "backend/src/main/resources/deploy/render.yaml").write_text(
                """isolation: enabled
value: staging
value: https://api.workos.com/
name: gh-clearing-staging-db
postgresMajorVersion: "16"
""",
                encoding="utf-8",
            )
            topology = {
                "tenancy": {
                    "strategy": "DISCRIMINATOR_COLUMN",
                    "discriminator_field": "tenant_id",
                },
                "environments": {
                    "dev": {
                        "deployment_manifest": "docker-compose.yml",
                        "database": {"major_version": "16", "name": "gh_clearing"},
                    },
                    "staging": {
                        "deployment_manifest": "backend/src/main/resources/deploy/render.yaml",
                        "spring_profile": "staging",
                        "auth_issuer_url": "https://api.workos.com/",
                        "network_isolation": True,
                        "database": {
                            "major_version": "16",
                            "name": "gh-clearing-staging-db",
                        },
                    },
                    "production": {
                        "deployment_manifest": None,
                        "status": "NOT_CONFIGURED",
                    },
                },
            }
            (root / "topology.json").write_text(json.dumps(topology), encoding="utf-8")

            old_topology = validate_topology.TOPOLOGY_PATH
            old_application = validate_topology.APPLICATION_PATH
            validate_topology.TOPOLOGY_PATH = Path("topology.json")
            validate_topology.APPLICATION_PATH = Path(
                "backend/src/main/resources/application.yml"
            )
            try:
                with working_directory(root):
                    with redirect_stdout(io.StringIO()):
                        valid_result = validate_topology.main()
                    self.assertEqual(0, valid_result)
                    (root / "docker-compose.yml").write_text(
                        "image: postgres:15-alpine\nPOSTGRES_DB: gh_clearing\n",
                        encoding="utf-8",
                    )
                    with redirect_stdout(io.StringIO()):
                        invalid_result = validate_topology.main()
                    self.assertEqual(1, invalid_result)
            finally:
                validate_topology.TOPOLOGY_PATH = old_topology
                validate_topology.APPLICATION_PATH = old_application


if __name__ == "__main__":
    unittest.main()
