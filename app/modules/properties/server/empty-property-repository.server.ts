import type {
	PropertyRepository,
	PublicCatalogQuery,
} from "./property-repository.server";

/** Local/test fallback that never invents listings. Production must configure Supabase. */
export class EmptyPropertyRepository implements PropertyRepository {
	listPublished(query: PublicCatalogQuery) {
		return Promise.resolve({
			items: [],
			page: query.page,
			pageSize: query.pageSize,
			totalItems: 0,
		});
	}

	findPublishedBySlug(slug: string) {
		void slug;
		return Promise.resolve(null);
	}

	listPublishedSitemapEntries() {
		return Promise.resolve([]);
	}
}
