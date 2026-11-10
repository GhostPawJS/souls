CREATE TABLE souls (
			id             INTEGER PRIMARY KEY,
			name           TEXT NOT NULL,
			slug           TEXT,
			essence        TEXT NOT NULL,
			description    TEXT NOT NULL,
			level          INTEGER NOT NULL DEFAULT 1 CHECK(level >= 1),
			created_at     INTEGER NOT NULL,
			updated_at     INTEGER NOT NULL,
			deleted_at     INTEGER,
			last_attuned_at INTEGER, external_id TEXT,
			CHECK(length(trim(name)) > 0),
			CHECK(length(trim(essence)) > 0),
			CHECK(length(trim(description)) > 0)
		) STRICT
	;
CREATE UNIQUE INDEX idx_souls_name ON souls(name) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_souls_slug ON souls(slug) WHERE slug IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_souls_deleted_at ON souls(deleted_at);
CREATE UNIQUE INDEX idx_souls_external_id ON souls(external_id) WHERE external_id IS NOT NULL;
CREATE TABLE souls_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
CREATE TABLE soul_traits (
			id          INTEGER PRIMARY KEY,
			soul_id     INTEGER NOT NULL REFERENCES souls(id),
			principle   TEXT NOT NULL,
			provenance  TEXT NOT NULL,
			generation  INTEGER NOT NULL CHECK(generation >= 1),
			status      TEXT NOT NULL DEFAULT 'active'
			            CHECK(status IN ('active', 'consolidated', 'promoted', 'reverted')),
			merged_into INTEGER REFERENCES soul_traits(id),
			created_at  INTEGER NOT NULL,
			updated_at  INTEGER NOT NULL,
			CHECK(length(trim(principle)) > 0),
			CHECK(length(trim(provenance)) > 0)
		) STRICT
	;
CREATE INDEX idx_soul_traits_soul_id ON soul_traits(soul_id);
CREATE INDEX idx_soul_traits_status ON soul_traits(soul_id, status);
CREATE INDEX idx_soul_traits_merged_into ON soul_traits(merged_into) WHERE merged_into IS NOT NULL;
CREATE TABLE soul_levels (
			id                  INTEGER PRIMARY KEY,
			soul_id             INTEGER NOT NULL REFERENCES souls(id),
			level               INTEGER NOT NULL CHECK(level >= 2),
			essence_before      TEXT NOT NULL,
			essence_after       TEXT NOT NULL,
			traits_consolidated TEXT NOT NULL DEFAULT '[]',
			traits_promoted     TEXT NOT NULL DEFAULT '[]',
			traits_carried      TEXT NOT NULL DEFAULT '[]',
			traits_merged       TEXT NOT NULL DEFAULT '[]',
			created_at          INTEGER NOT NULL
		, faded_shard_ids TEXT, state_before TEXT) STRICT
	;
CREATE INDEX idx_soul_levels_soul_id ON soul_levels(soul_id);
CREATE INDEX idx_soul_levels_soul_level ON soul_levels(soul_id, level);
CREATE TABLE soul_shards (
			id         INTEGER PRIMARY KEY,
			content    TEXT NOT NULL,
			source     TEXT NOT NULL,
			status     TEXT NOT NULL DEFAULT 'pending'
			           CHECK(status IN ('pending', 'faded')),
			sealed     INTEGER NOT NULL DEFAULT 0 CHECK(sealed IN (0, 1)),
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL, occurred_at INTEGER, inserted_at INTEGER, idempotency_key TEXT, ref TEXT,
			CHECK(length(trim(content)) > 0),
			CHECK(length(trim(source)) > 0)
		) STRICT
	;
CREATE TABLE shard_souls (
			shard_id INTEGER NOT NULL REFERENCES soul_shards(id),
			soul_id  INTEGER NOT NULL REFERENCES souls(id),
			PRIMARY KEY (shard_id, soul_id)
		) STRICT
	;
CREATE TABLE shard_citations (
			shard_id INTEGER NOT NULL REFERENCES soul_shards(id),
			trait_id INTEGER NOT NULL REFERENCES soul_traits(id), created_at INTEGER,
			PRIMARY KEY (shard_id, trait_id)
		) STRICT
	;
CREATE TABLE shard_tags (
			shard_id INTEGER NOT NULL REFERENCES soul_shards(id),
			tag      TEXT NOT NULL,
			PRIMARY KEY (shard_id, tag)
		) STRICT
	;
CREATE INDEX idx_shards_pending ON soul_shards(status, sealed, created_at) WHERE status = 'pending';
CREATE INDEX idx_shard_souls_soul ON shard_souls(soul_id);
CREATE INDEX idx_shard_citations_shard ON shard_citations(shard_id);
CREATE INDEX idx_shard_citations_trait ON shard_citations(trait_id);
CREATE INDEX idx_shard_tags_shard ON shard_tags(shard_id);
CREATE INDEX idx_shard_tags_tag ON shard_tags(tag);
CREATE UNIQUE INDEX idx_shard_idempotency ON soul_shards(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE VIRTUAL TABLE shard_fts USING fts5(
			content,
			content='soul_shards',
			content_rowid='id'
		)
/* shard_fts(content) */;
CREATE TABLE IF NOT EXISTS 'shard_fts_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'shard_fts_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'shard_fts_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'shard_fts_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE TRIGGER shard_fts_after_insert
		AFTER INSERT ON soul_shards BEGIN
			INSERT INTO shard_fts(rowid, content) VALUES (new.id, new.content);
		END;
CREATE TRIGGER shard_fts_after_update
		AFTER UPDATE ON soul_shards BEGIN
			INSERT INTO shard_fts(shard_fts, rowid, content) VALUES ('delete', old.id, old.content);
			INSERT INTO shard_fts(rowid, content) VALUES (new.id, new.content);
		END;
CREATE TRIGGER shard_fts_after_delete
		AFTER DELETE ON soul_shards BEGIN
			INSERT INTO shard_fts(shard_fts, rowid, content) VALUES ('delete', old.id, old.content);
		END;
CREATE TABLE soul_revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, entity TEXT NOT NULL CHECK(entity IN ('trait','essence')), entity_id INTEGER NOT NULL, soul_id INTEGER NOT NULL REFERENCES souls(id), old_text TEXT, new_text TEXT NOT NULL, reason TEXT, operator TEXT, created_at INTEGER NOT NULL) STRICT;
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE soul_revision_shards (revision_id INTEGER NOT NULL REFERENCES soul_revisions(id), shard_id INTEGER NOT NULL REFERENCES soul_shards(id), PRIMARY KEY(revision_id,shard_id)) STRICT;
CREATE INDEX idx_revisions_soul ON soul_revisions(soul_id, id);
CREATE TABLE soul_publications (id INTEGER PRIMARY KEY, soul_id INTEGER NOT NULL REFERENCES souls(id), path TEXT NOT NULL, marker TEXT NOT NULL, file_hash TEXT NOT NULL, block_hash TEXT NOT NULL, created_at INTEGER NOT NULL) STRICT;
CREATE TABLE soul_reviews (id INTEGER PRIMARY KEY, soul_id INTEGER NOT NULL REFERENCES souls(id), reason TEXT, created_at INTEGER NOT NULL) STRICT;
