/* eslint-disable jsdoc/require-param */
/**
 * Internal dependencies
 */
import 'calypso/state/ui/init';

export const ROUTE_CLEAR_LAST_NON_EDITOR = 'ROUTE_CLEAR_LAST_NON_EDITOR' as const;
export const ROUTE_SET = 'ROUTE_SET' as const;

export type RouteClearAction = {
	type: typeof ROUTE_CLEAR_LAST_NON_EDITOR;
};

export type RouteSetAction = {
	path: string;
	query: {
		[ key: string ]: unknown;
	};
	type: typeof ROUTE_SET;
};

type RouteClearActionCreator = () => RouteClearAction;

type RouteSetActionCreator = (
	path: RouteSetAction[ 'path' ],
	query: RouteSetAction[ 'query' ]
) => RouteSetAction;

/**
 * Returns an action object signalling that the current route is to be changed
 */
export const setRoute: RouteSetActionCreator = ( path, query = {} ) => {
	return {
		type: ROUTE_SET,
		path,
		query,
	};
};

/**
 * Action to forget what the last non-editor route was.
 */
export const clearLastNonEditorRoute: RouteClearActionCreator = () => {
	return {
		type: ROUTE_CLEAR_LAST_NON_EDITOR,
	};
};
