const webdriver = require( 'selenium-webdriver' );
const AsyncBaseContainer = require( '../async-base-container' );
const driverHelper = require( '../driver-helper.js' );

const by = webdriver.By;

class NavBarComponent extends AsyncBaseContainer {
	constructor( driver ) {
		super( driver, by.css( '.masterbar' ) );
	}
	async clickCreateNewPost() {
		const postButtonSelector = by.css( 'a.masterbar__item-new' );
		await driverHelper.clickWhenClickable( this.driver, postButtonSelector, this.explicitWaitMS );
	}
	async clickProfileLink() {
		const profileSelector = by.css( 'a.masterbar__item-me' );
		return await driverHelper.clickWhenClickable(
			this.driver,
			profileSelector,
			this.explicitWaitMS
		);
	}
}

module.exports = NavBarComponent;
