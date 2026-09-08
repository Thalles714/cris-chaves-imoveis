import { redirect } from "react-router";

import type { Route } from "./+types/properties-legacy";

export function loader({ request }: Route.LoaderArgs) {
	const { search } = new URL(request.url);
	return redirect(`/${search}`, 308);
}
