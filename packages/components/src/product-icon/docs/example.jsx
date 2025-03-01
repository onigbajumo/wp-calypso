import { Fragment } from 'react';
import ProductIcon from '../index';

function ProductIconExample() {
	const wrapperStyle = {
		display: 'flex',
		flexFlow: 'row wrap',
	};
	const iconStyle = {
		width: 64,
		height: 64,
		margin: '8px 8px 8px 0',
	};

	return (
		<Fragment>
			<h3>Plan Icons</h3>
			<div style={ wrapperStyle }>
				<div style={ iconStyle }>
					<ProductIcon slug="free_plan" />
				</div>
				<div style={ iconStyle }>
					<ProductIcon slug="blogger-bundle" />
				</div>
				<div style={ iconStyle }>
					<ProductIcon slug="personal-bundle" />
				</div>
				<div style={ iconStyle }>
					<ProductIcon slug="value_bundle" />
				</div>
				<div style={ iconStyle }>
					<ProductIcon slug="business-bundle" />
				</div>
				<div style={ iconStyle }>
					<ProductIcon slug="ecommerce-bundle" />
				</div>
			</div>

			<hr />

			<h3>Jetpack Plan Icons</h3>
			<div style={ wrapperStyle }>
				<div style={ iconStyle }>
					<ProductIcon slug="jetpack_free" />
				</div>
				<div style={ iconStyle }>
					<ProductIcon slug="jetpack_personal" />
				</div>
				<div style={ iconStyle }>
					<ProductIcon slug="jetpack_premium" />
				</div>
				<div style={ iconStyle }>
					<ProductIcon slug="jetpack_business" />
				</div>
			</div>

			<hr />

			<h3>Jetpack Products</h3>
			<div style={ wrapperStyle }>
				<div style={ iconStyle }>
					<ProductIcon slug="jetpack_backup_daily" />
				</div>
				<div style={ iconStyle }>
					<ProductIcon slug="jetpack_backup_realtime" />
				</div>
				<div style={ iconStyle }>
					<ProductIcon slug="jetpack_anti_spam" />
				</div>
			</div>

			<hr />

			<h3>Jetpack Plan Icons v2</h3>
			<div style={ wrapperStyle }>
				<div style={ iconStyle }>
					<ProductIcon slug="jetpack_complete_v2" />
				</div>
			</div>

			<hr />

			<h3>Jetpack Bundle Icons v2</h3>
			<div style={ wrapperStyle }>
				<div style={ iconStyle }>
					<ProductIcon slug="jetpack_security_v2" />
				</div>
			</div>

			<hr />

			<h3>Jetpack Individual Product Icons v2</h3>
			<div style={ wrapperStyle }>
				<div style={ iconStyle }>
					<ProductIcon slug="jetpack_backup_v2" />
				</div>
				<div style={ iconStyle }>
					<ProductIcon slug="jetpack_scan_v2" />
				</div>
				<div style={ iconStyle }>
					<ProductIcon slug="jetpack_anti_spam_v2" />
				</div>
				<div style={ iconStyle }>
					<ProductIcon slug="jetpack_search_v2" />
				</div>
			</div>
		</Fragment>
	);
}

ProductIconExample.displayName = 'ProductIcon';

export default ProductIconExample;
