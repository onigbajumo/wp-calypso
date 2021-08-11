/**
 * External dependencies
 */
import { isEqual, omit } from 'lodash';
import { Reducer, AnyAction } from 'redux';

/**
 * Internal dependencies
 */
import { ROUTE_SET } from 'calypso/state/route/actions';

export type QueryType = {
	[ key: string ]: unknown;
	_timestamp?: number;
};

export type QueryState = {
	initial: QueryType | false;
	current: QueryType | false;
	previous: QueryType | false;
};

const timestamped = ( query: QueryType ): QueryType => ( {
	...query,
	_timestamp: Date.now(),
} );

const isEqualQuery = ( state: QueryState[ keyof QueryState ], query: QueryType ) =>
	isEqual( omit( state, '_timestamp' ), omit( query, '_timestamp' ) );

const initialReducer = ( state: QueryState[ 'initial' ], query: QueryType ) =>
	state === false ? timestamped( query ) : state;

const currentReducer = ( state: QueryState[ 'current' ], query: QueryType ) =>
	! isEqualQuery( state, query ) ? timestamped( query ) : state;

const initialState: QueryState = {
	initial: false,
	current: false,
	previous: false,
};

export const queryReducer: Reducer< QueryState, AnyAction > = ( state = initialState, action ) => {
	const { query, type } = action;
	switch ( type ) {
		case ROUTE_SET:
			return {
				initial: initialReducer( state.initial, query ),
				current: currentReducer( state.current, query ),
				previous: state.current === false ? false : state.current,
			};
	}
	return state;
};

export default queryReducer;
