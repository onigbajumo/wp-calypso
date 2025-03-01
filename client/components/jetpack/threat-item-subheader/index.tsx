import classnames from 'classnames';
import { useTranslate } from 'i18n-calypso';
import moment from 'moment';
import React from 'react';
import Badge from 'calypso/components/badge';
import { Threat } from 'calypso/components/jetpack/threat-item/types';
import {
	getThreatType,
	getThreatVulnerability,
} from 'calypso/components/jetpack/threat-item/utils';

import './style.scss';

interface Props {
	threat: Threat;
	isFixable: bool;
}

const entryActionClassNames = ( threat: Threat ) => {
	return {
		'is-fixed': threat.status === 'fixed',
		'is-ignored': threat.status === 'ignored',
	};
};

const formatDate = ( date: Date ) => {
	return moment( date ).format( 'LL' );
};

const getThreatStatusMessage = ( translate, threat: Threat ) => {
	const { status, fixedOn } = threat;

	const date = fixedOn && formatDate( fixedOn );

	if ( status === 'fixed' ) {
		return date
			? translate( 'Threat fixed on %(date)s', {
					args: { date },
					comment: 'Past tense action: a threat was fixed on a specific date',
			  } )
			: translate( 'Threat fixed', {
					comment: 'Past tense action: a threat was fixed on an unspecified date',
			  } );
	}

	if ( status === 'ignored' ) {
		return date
			? translate( 'Threat ignored on %(date)s', {
					args: { date },
					comment: 'Past tense action: a threat was ignored on a specific date',
			  } )
			: translate( 'Threat ignored', {
					comment: 'Past tense action: a threat was ignored on an unspecified date',
			  } );
	}

	return null;
};

const getAutoFixBadge = ( translate, threat: Threat, isFixable ) => {
	if ( isFixable && threat.status !== 'fixed' ) {
		return (
			<Badge className={ classnames( 'threat-item-subheader__badge', 'is-auto-fix' ) }>
				<small>{ translate( 'Auto fix' ) }</small>
			</Badge>
		);
	}
	return null;
};

// This renders two different kind of sub-headers. One is for current threats (displayed
// in the Scanner section), and the other for threats in the History section.
const ThreatItemSubheader: React.FC< Props > = ( { threat, isFixable } ) => {
	const translate = useTranslate();
	if ( threat.status === 'current' ) {
		switch ( getThreatType( threat ) ) {
			case 'file':
				return (
					<>
						{ translate( 'Threat found ({{signature/}})', {
							components: {
								signature: (
									<span className="threat-item-subheader__alert-signature">
										{ threat.signature }
									</span>
								),
							},
						} ) }
						{ getAutoFixBadge( translate, threat, isFixable ) }
					</>
				);
			default:
				return (
					<>
						{ getThreatVulnerability( threat ) }
						{ getAutoFixBadge( translate, threat, isFixable ) }
					</>
				);
		}
	} else {
		const threatStatusMessage = getThreatStatusMessage( translate, threat );

		return (
			<>
				<div className="threat-item-subheader__subheader">
					<span className="threat-item-subheader__status">
						{ translate( 'Threat found on %s', {
							args: formatDate( threat.firstDetected ),
						} ) }
					</span>
					{ threatStatusMessage && (
						<>
							<span className="threat-item-subheader__status-separator"></span>
							<span
								className={ classnames(
									'threat-item-subheader__status',
									entryActionClassNames( threat )
								) }
							>
								{ threatStatusMessage }
							</span>
						</>
					) }
				</div>
				<Badge
					className={ classnames(
						'threat-item-subheader__badge',
						entryActionClassNames( threat )
					) }
				>
					<small>
						{ threat.status === 'fixed' ? translate( 'fixed' ) : translate( 'ignored' ) }
					</small>
				</Badge>
			</>
		);
	}
};

export default ThreatItemSubheader;
