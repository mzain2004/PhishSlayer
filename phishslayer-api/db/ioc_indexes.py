async def create_ioc_indexes(db) -> None:
    """Run on startup to ensure IOC collection has proper indexes."""
    ioc_collection = db["iocs"]

    await ioc_collection.create_index(
        [("org_id", 1), ("value", 1), ("type", 1)],
        unique=True,
        name="unique_ioc_per_org",
    )

    # TTL index — MongoDB auto-deletes expired IOCs at expires_at time
    await ioc_collection.create_index(
        "expires_at",
        expireAfterSeconds=0,
        name="ttl_expiry",
        sparse=True,
    )

    await ioc_collection.create_index(
        [("org_id", 1), ("type", 1), ("confidence_score", -1)],
        name="org_type_confidence",
    )
    await ioc_collection.create_index(
        [("org_id", 1), ("threat_type", 1)],
        name="org_threat_type",
    )
    await ioc_collection.create_index(
        [("org_id", 1), ("false_positive", 1)],
        name="org_false_positives",
    )

    print("IOC indexes created successfully")
