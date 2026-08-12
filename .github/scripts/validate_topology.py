import json
import sys
from pathlib import Path


TOPOLOGY_PATH = Path("topology.json")
APPLICATION_PATH = Path("backend/src/main/resources/application.yml")


def fail(message):
    print(f"Error: {message}")
    return 1


def require_fragment(text, fragment, source):
    if fragment not in text:
        raise ValueError(f"{source} does not contain expected topology value: {fragment}")


def main():
    try:
        topology = json.loads(TOPOLOGY_PATH.read_text(encoding="utf-8"))
        application = APPLICATION_PATH.read_text(encoding="utf-8")
    except (OSError, json.JSONDecodeError) as error:
        return fail(f"Cannot load topology inputs: {error}")

    try:
        tenancy = topology["tenancy"]
        require_fragment(application, f"strategy: {tenancy['strategy']}", APPLICATION_PATH)
        require_fragment(
            application,
            f"discriminator-field: {tenancy['discriminator_field']}",
            APPLICATION_PATH,
        )

        environments = topology["environments"]
        dev = environments["dev"]
        dev_manifest = Path(dev["deployment_manifest"])
        dev_text = dev_manifest.read_text(encoding="utf-8")
        dev_database = dev["database"]
        require_fragment(
            dev_text,
            f"image: postgres:{dev_database['major_version']}-alpine",
            dev_manifest,
        )
        require_fragment(dev_text, f"POSTGRES_DB: {dev_database['name']}", dev_manifest)

        staging = environments["staging"]
        staging_manifest = Path(staging["deployment_manifest"])
        staging_text = staging_manifest.read_text(encoding="utf-8")
        staging_database = staging["database"]
        require_fragment(staging_text, f"value: {staging['spring_profile']}", staging_manifest)
        require_fragment(
            staging_text,
            f"value: {staging['auth_issuer_url']}",
            staging_manifest,
        )
        require_fragment(
            staging_text,
            f"name: {staging_database['name']}",
            staging_manifest,
        )
        require_fragment(
            staging_text,
            f"postgresMajorVersion: \"{staging_database['major_version']}\"",
            staging_manifest,
        )
        if staging["network_isolation"]:
            require_fragment(staging_text, "isolation: enabled", staging_manifest)

        production = environments["production"]
        if production.get("deployment_manifest") is None \
                and production.get("status") != "NOT_CONFIGURED":
            raise ValueError(
                "production without a deployment manifest must be marked NOT_CONFIGURED"
            )
    except (KeyError, OSError, TypeError, ValueError) as error:
        return fail(f"Topology reconciliation failed: {error}")

    print("Deployment topology reconciliation PASSED.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
