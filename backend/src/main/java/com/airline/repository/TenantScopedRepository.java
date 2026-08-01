package com.airline.repository;

import org.springframework.data.repository.NoRepositoryBean;
import org.springframework.data.repository.Repository;

import java.util.List;

/**
 * Base repository for tenant-owned aggregates.
 *
 * <p>It intentionally does not expose unscoped {@code findAll}, {@code findById},
 * or {@code existsById} operations. Tenant-owned repositories must declare every
 * read with the tenant or an authorized parent aggregate in its signature.</p>
 */
@NoRepositoryBean
public interface TenantScopedRepository<T, ID> extends Repository<T, ID> {

    <S extends T> S save(S entity);

    <S extends T> List<S> saveAll(Iterable<S> entities);

    void delete(T entity);
}
