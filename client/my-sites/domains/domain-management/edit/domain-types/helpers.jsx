import classNames from 'classnames';
import { Fragment } from 'react';
import { type as domainTypes } from 'calypso/lib/domains/constants';
import { isExpiring, shouldRenderExpiringCreditCard } from 'calypso/lib/purchases';

function WrapDomainStatusButtons( props ) {
	const wrapperClassNames = classNames( 'domain-types__wrap-me', props.className );
	return (
        <Fragment>
			<div className="domain-types__break" />
			<div className={ wrapperClassNames }>{ props.children }</div>
		</Fragment>
    );
}

function DomainExpiryOrRenewal( { domain, isLoadingPurchase, moment, purchase, translate } ) {
	if ( isLoadingPurchase ) {
		return (
			<div className="domain-types__expires-placeholder">
				<p />
			</div>
		);
	}

	let text;

	if ( domain.type === domainTypes.MAPPED && ! domain.expiry ) {
		text = translate( 'Expires: Never' );
	} else if ( domain.expired ) {
		text = translate( 'Expired: %(expiry_date)s', {
			args: {
				expiry_date: moment( domain.expiry ).format( 'LL' ),
			},
		} );
	} else if (
		domain.isAutoRenewing &&
		domain.autoRenewalDate &&
		purchase &&
		! isExpiring( purchase ) &&
		! shouldRenderExpiringCreditCard( purchase )
	) {
		if ( domain.type === domainTypes.MAPPED && domain.bundledPlanSubscriptionId ) {
			text = translate( 'Renews with your plan on %(renewal_date)s', {
				args: {
					renewal_date: moment( domain.autoRenewalDate ).format( 'LL' ),
				},
			} );
		} else {
			text = translate( 'Renews: %(renewal_date)s', {
				args: {
					renewal_date: moment( domain.autoRenewalDate ).format( 'LL' ),
				},
			} );
		}
	} else if ( domain.type === domainTypes.MAPPED && domain.bundledPlanSubscriptionId ) {
		text = translate( 'Expires with your plan on %(expiry_date)s', {
			args: {
				expiry_date: moment( domain.expiry ).format( 'LL' ),
			},
		} );
	} else {
		text = translate( 'Expires: %(expiry_date)s', {
			args: {
				expiry_date: moment( domain.expiry ).format( 'LL' ),
			},
		} );
	}

	return <div>{ text }</div>;
}

export { WrapDomainStatusButtons, DomainExpiryOrRenewal };
