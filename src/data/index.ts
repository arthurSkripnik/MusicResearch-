// The only place that loads the data files in /data (one record per line, edited by tools/me.ts, not by hand).
import type { Entity, Relation, Journal, Hypothesis, JournalNote, BridgeNote } from './schema';
import genre from '../../data/entities/genre.json';
import scene from '../../data/entities/scene.json';
import label from '../../data/entities/label.json';
import artist from '../../data/entities/artist.json';
import release from '../../data/entities/release.json';
import track from '../../data/entities/track.json';
import city from '../../data/entities/city.json';
import event from '../../data/entities/event.json';
import concept from '../../data/entities/concept.json';
import producer from '../../data/entities/producer.json';
import relations from '../../data/relations.json';
import brief from '../../data/journal/brief-2026-11.json';
import notes from '../../data/journal/notes.json';
import hypotheses from '../../data/hypotheses.json';
import covers from '../../data/covers.json';
import spotify from '../../data/spotify.json';
import bridges from '../../data/bridges.json';

/** Entity files, in the order the graph has always used. Add a new type here and in tools/lib.ts ENTITY_TYPES. */
export const dataEntities = [genre, scene, label, artist, release, track, city, event, concept, producer]
  .flat() as unknown as Entity[];
export const dataRelations = relations as unknown as Relation[];
export const briefJournal = brief as unknown as Journal;
export const journalNotes = notes as unknown as JournalNote[];
export const baseHypotheses = hypotheses as unknown as Hypothesis[];
export const bundledCovers = covers as Record<string, { src: string; link?: string; source: string }>;
export const spotifyLinks = spotify as Record<string, unknown>;
export const bridgeNotes = bridges as unknown as BridgeNote[];
