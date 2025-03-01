import PropTypes from 'prop-types';
import { Component } from 'react';

export default class FeaturedImage extends Component {
	constructor( props ) {
		super();
		this.state = { src: props.src };
		this.handleImageError = () => {
			this.setState( { src: '' } );
		};
	}

	UNSAFE_componentWillReceiveProps( nextProps ) {
		if ( nextProps.src !== this.props.src ) {
			this.setState( { src: nextProps.src } );
		}
	}

	render() {
		if ( ! this.state.src ) {
			return null;
		}

		return (
			<div className="reader-full-post__featured-image">
				<img src={ this.state.src } onError={ this.handleImageError } alt={ this.props.alt } />
			</div>
		);
	}
}

FeaturedImage.propTypes = {
	src: PropTypes.string,
	alt: PropTypes.string,
};
