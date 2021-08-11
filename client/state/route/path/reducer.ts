/**
 * External dependencies
 */
import { Reducer, AnyAction } from 'redux';

/**
 * Internal dependencies
 */
import { ROUTE_SET } from 'calypso/state/route/actions';

export type PathType = string;

type PathState = {
	initial: PathType;
	current: PathType;
	previous: PathType;
};

const initialState: PathState = {
	initial: '',
	current: '',
	previous: '',
};

export const pathReducer: Reducer< PathState, AnyAction > = ( state = initialState, action ) => {
	const { path, type } = action;
	switch ( type ) {
		case ROUTE_SET:
			return {
				initial: state.initial === '' ? path : state.initial,
				current: path,
				previous: state.current === '' ? '' : state.current,
			};
	}
	return state;
};

export default pathReducer;
