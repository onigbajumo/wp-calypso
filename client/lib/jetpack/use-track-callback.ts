import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { recordTracksEvent } from 'calypso/state/analytics/actions';
import getSelectedSiteId from 'calypso/state/ui/selectors/get-selected-site-id';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

const useTrackCallback = ( callback: Function = noop, eventName: string, eventProps = {} ) => {
	const dispatch = useDispatch();
	const siteId = useSelector( getSelectedSiteId );
	const trackedCallback = React.useCallback(
		( ...rest ) => {
			dispatch(
				recordTracksEvent( eventName, {
					site_id: siteId,
					...eventProps,
				} )
			);
			callback( ...rest );
		},
		[ callback, eventName, dispatch, siteId ]
	);
	return trackedCallback;
};

export default useTrackCallback;
