import CalypsoShoppingCartProvider from 'calypso/my-sites/checkout/calypso-shopping-cart-provider';
import EmailForwarding from 'calypso/my-sites/email/email-forwarding';
import EmailManagementHome from 'calypso/my-sites/email/email-management/email-home';
import TitanControlPanelRedirect from 'calypso/my-sites/email/email-management/titan-control-panel-redirect';
import TitanManageMailboxes from 'calypso/my-sites/email/email-management/titan-manage-mailboxes';
import TitanManagementIframe from 'calypso/my-sites/email/email-management/titan-management-iframe';
import EmailProvidersComparison from 'calypso/my-sites/email/email-providers-comparison';
import GSuiteAddUsers from 'calypso/my-sites/email/gsuite-add-users';
import InboxManagement from 'calypso/my-sites/email/inbox';
import TitanAddMailboxes from 'calypso/my-sites/email/titan-add-mailboxes';
import TitanSetUpMailbox from 'calypso/my-sites/email/titan-set-up-mailbox';
import TitanSetUpThankYou from 'calypso/my-sites/email/titan-set-up-thank-you';

export default {
	emailManagementAddGSuiteUsers( pageContext, next ) {
		pageContext.primary = (
			<CalypsoShoppingCartProvider>
				<GSuiteAddUsers
					productType={ pageContext.params.productType }
					selectedDomainName={ pageContext.params.domain }
				/>
			</CalypsoShoppingCartProvider>
		);

		next();
	},

	emailManagementManageTitanAccount( pageContext, next ) {
		pageContext.primary = (
			<TitanManagementIframe
				domainName={ pageContext.params.domain }
				context={ pageContext.query.context }
			/>
		);

		next();
	},

	emailManagementManageTitanMailboxes( pageContext, next ) {
		pageContext.primary = (
			<CalypsoShoppingCartProvider>
				<TitanManageMailboxes
					context={ pageContext.query.context }
					selectedDomainName={ pageContext.params.domain }
				/>
			</CalypsoShoppingCartProvider>
		);

		next();
	},

	emailManagementNewTitanAccount( pageContext, next ) {
		pageContext.primary = (
			<CalypsoShoppingCartProvider>
				<TitanAddMailboxes selectedDomainName={ pageContext.params.domain } />
			</CalypsoShoppingCartProvider>
		);

		next();
	},

	emailManagementTitanSetUpMailbox( pageContext, next ) {
		pageContext.primary = (
			<CalypsoShoppingCartProvider>
				<TitanSetUpMailbox selectedDomainName={ pageContext.params.domain } />
			</CalypsoShoppingCartProvider>
		);

		next();
	},

	emailManagementPurchaseNewEmailAccount( pageContext, next ) {
		pageContext.primary = (
			<CalypsoShoppingCartProvider>
				<EmailProvidersComparison
					comparisonContext="email-purchase"
					selectedDomainName={ pageContext.params.domain }
				/>
			</CalypsoShoppingCartProvider>
		);

		next();
	},

	emailManagementTitanControlPanelRedirect( pageContext, next ) {
		pageContext.primary = (
			<TitanControlPanelRedirect
				domainName={ pageContext.params.domain }
				siteSlug={ pageContext.params.site }
				context={ pageContext.query.context }
			/>
		);

		next();
	},

	emailManagementTitanSetUpThankYou( pageContext, next ) {
		pageContext.primary = (
			<TitanSetUpThankYou
				domainName={ pageContext.params.domain }
				emailAddress={ pageContext.query.email }
			/>
		);

		next();
	},

	emailManagementForwarding( pageContext, next ) {
		pageContext.primary = <EmailForwarding selectedDomainName={ pageContext.params.domain } />;

		next();
	},

	emailManagement( pageContext, next ) {
		pageContext.primary = (
			<CalypsoShoppingCartProvider>
				<EmailManagementHome selectedDomainName={ pageContext.params.domain } />
			</CalypsoShoppingCartProvider>
		);

		next();
	},

	emailManagementInbox( pageContext, next ) {
		pageContext.primary = <InboxManagement />;
		next();
	},
};
