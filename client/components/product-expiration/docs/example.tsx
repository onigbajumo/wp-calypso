import moment from 'moment';
import React from 'react';
import ProductExpiration from '../index';

function ProductExpirationExample() {
	return (
		<>
			<p>
				Product still refundable:
				<br />
				<em>
					<ProductExpiration
						purchaseDateMoment={ moment() }
						expiryDateMoment={ moment() }
						renewDateMoment={ moment() }
						isRefundable
					/>
				</em>
			</p>
			<p>
				Product previously expired:
				<br />
				<em>
					<ProductExpiration expiryDateMoment={ moment( new Date( 0 ) ) } />
				</em>
			</p>
			<p>
				Product subscription expires in future:
				<br />
				<em>
					<ProductExpiration renewDateMoment={ moment().add( 1, 'day' ) } />
				</em>
			</p>
		</>
	);
}
ProductExpirationExample.displayName = 'ProductExpiration';

export default ProductExpirationExample;
