ARG KEYCLOAK_VERSION=26.2.4

FROM registry.access.redhat.com/ubi9 AS postgres-client
RUN mkdir -p /mnt/rootfs && \
    dnf install --installroot /mnt/rootfs postgresql \
      --releasever 9 --setopt=install_weak_deps=false --setopt=keepcache=false -y && \
    rm -rf /mnt/rootfs/var/cache/dnf

FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION} AS keycloak-build
ENV KC_DB=postgres \
    KC_HEALTH_ENABLED=true \
    KC_METRICS_ENABLED=true
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION}
COPY --from=postgres-client /mnt/rootfs /
COPY --from=keycloak-build /opt/keycloak/ /opt/keycloak/
COPY --chmod=755 backend/src/main/resources/deploy/keycloak/render-entrypoint.sh /opt/keycloak/bin/render-entrypoint.sh
COPY backend/src/main/resources/deploy/keycloak/realm-gh-clearing.json /opt/keycloak/data/import/realm-gh-clearing.json

ENTRYPOINT ["/opt/keycloak/bin/render-entrypoint.sh"]
CMD ["start", "--optimized", "--import-realm"]
