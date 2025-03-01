import { Button } from '@wordpress/components';
import { useTranslate } from 'i18n-calypso';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { preventWidows } from 'calypso/lib/formatting';
import { recordTracksEvent } from 'calypso/state/analytics/actions/record';
import { StorageUsageLevels } from '../storage-usage-levels';

import './style.scss';

const useStatusText = ( usageLevel: StorageUsageLevels ) => {
	const translate = useTranslate();

	// TODO: For StorageUsageLevels.Warning, estimate how many days until
	// all storage is used, and show that in the status text.
	return useMemo( () => {
		switch ( usageLevel ) {
			case StorageUsageLevels.Warning:
				return translate( 'You will reach your storage limit soon.' );
			case StorageUsageLevels.Critical:
				return translate( 'You’re running out of storage space.' );
			case StorageUsageLevels.Full:
				return translate( 'You ran out of storage space.' );
		}

		return null;
	}, [ translate, usageLevel ] );
};

type OwnProps = {
	href: string;
	bytesUsed: number;
	usageLevel: StorageUsageLevels;
};

export const BackupStorageSpaceUpsell: React.FC< OwnProps > = ( {
	href,
	bytesUsed,
	usageLevel,
} ) => {
	const dispatch = useDispatch();
	const translate = useTranslate();

	useEffect( () => {
		dispatch(
			recordTracksEvent( 'calypso_jetpack_backup_storage_upsell_display', {
				type: StorageUsageLevels[ usageLevel ],
				bytes_used: bytesUsed,
				path: '/backup/:site',
			} )
		);
	}, [ dispatch, usageLevel, bytesUsed ] );

	const onUpsellClick = useCallback( () => {
		dispatch(
			recordTracksEvent( 'calypso_jetpack_backup_storage_upsell_click', {
				type: StorageUsageLevels[ usageLevel ],
				bytes_used: bytesUsed,
				path: '/backup/:site',
			} )
		);
	}, [ dispatch, usageLevel, bytesUsed ] );

	const statusText = preventWidows( useStatusText( usageLevel ) );
	const actionText = preventWidows( translate( 'Upgrade your backup storage to 2TB' ) );

	return (
		<>
			{ usageLevel === StorageUsageLevels.Full && (
				<div className="backup-storage-space-upsell__title">
					{ translate( 'Your Backup storage is full and new backups have been paused' ) }
				</div>
			) }
			<Button
				className="backup-storage-space-upsell__call-to-action"
				href={ href }
				onClick={ onUpsellClick }
			>
				<div className="backup-storage-space-upsell__copy">
					<div className="backup-storage-space-upsell__status">{ statusText }</div>
					<div className="backup-storage-space-upsell__action-text">{ actionText }</div>
				</div>
				<span className="backup-storage-space-upsell__arrow">&#8594;</span>
			</Button>
		</>
	);
};
