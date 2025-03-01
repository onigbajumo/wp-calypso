import classNames from 'classnames';
import { isEqual } from 'lodash';
import PropTypes from 'prop-types';
import { Component } from 'react';
import { connect } from 'react-redux';
import Draggable from 'calypso/components/draggable';
import {
	imageEditorCrop,
	imageEditorComputedCrop,
} from 'calypso/state/editor/image-editor/actions';
import { AspectRatios } from 'calypso/state/editor/image-editor/constants';
import { defaultCrop } from 'calypso/state/editor/image-editor/reducer';
import {
	getImageEditorCropBounds,
	getImageEditorAspectRatio,
	getImageEditorTransform,
	getImageEditorCrop,
	imageEditorHasChanges,
} from 'calypso/state/editor/image-editor/selectors';
import getImageEditorOriginalAspectRatio from 'calypso/state/selectors/get-image-editor-original-aspect-ratio';

const noop = () => {};

class ImageEditorCrop extends Component {
	static propTypes = {
		degrees: PropTypes.number,
		bounds: PropTypes.shape( {
			topBound: PropTypes.number,
			leftBound: PropTypes.number,
			bottomBound: PropTypes.number,
			rightBound: PropTypes.number,
		} ),
		crop: PropTypes.shape( {
			topRatio: PropTypes.number,
			leftRatio: PropTypes.number,
			widthRatio: PropTypes.number,
			heightRatio: PropTypes.number,
		} ),
		aspectRatio: PropTypes.string,
		imageEditorCrop: PropTypes.func,
		imageEditorComputedCrop: PropTypes.func,
		minCropSize: PropTypes.shape( {
			width: PropTypes.number,
			height: PropTypes.number,
		} ),
		imageEditorHasChanges: PropTypes.bool,
	};

	static defaultProps = {
		degrees: 0,
		bounds: {
			topBound: 0,
			leftBound: 0,
			bottomBound: 100,
			rightBound: 100,
		},
		imageEditorCrop: noop,
		imageEditorComputedCrop: noop,
		minCropSize: {
			width: 50,
			height: 50,
		},
		imageEditorHasChanges: false,
	};

	constructor( props ) {
		super( props );

		this.state = this.getDefaultState( props );

		this.onTopLeftDrag = this.onTopLeftDrag.bind( this );
		this.onTopRightDrag = this.onTopRightDrag.bind( this );
		this.onBottomLeftDrag = this.onBottomLeftDrag.bind( this );
		this.onBottomRightDrag = this.onBottomRightDrag.bind( this );

		this.applyCrop = this.applyCrop.bind( this );
		this.onBorderDrag = this.onBorderDrag.bind( this );
	}

	getDefaultState( props ) {
		return {
			top: props.bounds.topBound,
			left: props.bounds.leftBound,
			bottom: props.bounds.bottomBound,
			right: props.bounds.rightBound,
		};
	}

	UNSAFE_componentWillMount() {
		this.updateCrop( this.getDefaultState( this.props ), this.props, this.applyComputedCrop );
	}

	UNSAFE_componentWillReceiveProps( newProps ) {
		const { bounds, aspectRatio, crop } = this.props;

		if ( ! isEqual( bounds, newProps.bounds ) ) {
			const imageWidth = newProps.bounds.rightBound - newProps.bounds.leftBound;
			const imageHeight = newProps.bounds.bottomBound - newProps.bounds.topBound;
			const newTop = newProps.bounds.topBound + newProps.crop.topRatio * imageHeight;
			const newLeft = newProps.bounds.leftBound + newProps.crop.leftRatio * imageWidth;
			const newBottom = newTop + newProps.crop.heightRatio * imageHeight;
			const newRight = newLeft + newProps.crop.widthRatio * imageWidth;

			const newBounds = {
				top: newTop,
				left: newLeft,
				bottom: newBottom,
				right: newRight,
			};

			this.setState( newBounds );

			// We need to update crop even after clicking on the "Reset" button so let's
			// always update it on receiving new props (without calling the applyCrop callback).
			this.updateCrop( newBounds );
		}

		if ( aspectRatio !== newProps.aspectRatio ) {
			this.updateCrop( this.getDefaultState( newProps ), newProps, this.applyCrop );
		}

		// After clicking the "Reset" button, we need to recompute and set crop.
		if (
			! newProps.imageEditorHasChanges &&
			isEqual( newProps.crop, defaultCrop ) &&
			! isEqual( crop, newProps.crop )
		) {
			this.updateCrop( this.getDefaultState( newProps ), newProps, this.applyComputedCrop );
		}
	}

	updateCrop( newValues, props, callback ) {
		props = props || this.props;

		const aspectRatio = props.aspectRatio;

		if ( aspectRatio === AspectRatios.FREE ) {
			this.setState( newValues, callback );

			return;
		}

		const rotated = props.degrees % 180 !== 0;
		const newState = Object.assign( {}, this.state, newValues );
		const newWidth = newState.right - newState.left;
		const newHeight = newState.bottom - newState.top;

		let imageWidth;
		let imageHeight;
		let finalWidth = newWidth;
		let finalHeight = newHeight;

		switch ( aspectRatio ) {
			case AspectRatios.ORIGINAL:
				//image not loaded yet
				if ( ! this.props.originalAspectRatio ) {
					this.setState( newValues, callback );
					return;
				}

				const { width, height } = this.props.originalAspectRatio;
				imageWidth = rotated ? height : width;
				imageHeight = rotated ? width : height;

				break;

			case AspectRatios.ASPECT_1X1:
				imageWidth = 1;
				imageHeight = 1;

				break;

			case AspectRatios.ASPECT_16X9:
				imageWidth = rotated ? 9 : 16;
				imageHeight = rotated ? 16 : 9;

				break;

			case AspectRatios.ASPECT_4X3:
				imageWidth = rotated ? 3 : 4;
				imageHeight = rotated ? 4 : 3;

				break;

			case AspectRatios.ASPECT_3X2:
				imageWidth = rotated ? 2 : 3;
				imageHeight = rotated ? 3 : 2;

				break;
		}

		const ratio = Math.min( newWidth / imageWidth, newHeight / imageHeight );

		finalWidth = imageWidth * ratio;
		finalHeight = imageHeight * ratio;

		if ( newValues.hasOwnProperty( 'top' ) ) {
			newValues.top = newState.bottom - finalHeight;
		} else if ( newValues.hasOwnProperty( 'bottom' ) ) {
			newValues.bottom = newState.top + finalHeight;
		}

		if ( newValues.hasOwnProperty( 'left' ) ) {
			newValues.left = newState.right - finalWidth;
		} else if ( newValues.hasOwnProperty( 'right' ) ) {
			newValues.right = newState.left + finalWidth;
		}

		this.setState( newValues, callback );
	}

	onTopLeftDrag( x, y ) {
		const { right, bottom } = this.state;
		const { minCropSize } = this.props;

		let top = y;
		let left = x;

		if ( right - left <= minCropSize.width ) {
			left = right - minCropSize.width;
		}

		if ( bottom - top <= minCropSize.height ) {
			top = bottom - minCropSize.height;
		}

		this.updateCrop( {
			top,
			left,
		} );
	}

	onTopRightDrag( x, y ) {
		const { left, bottom } = this.state;
		const { minCropSize } = this.props;

		let top = y;
		let right = x;

		if ( right - left <= minCropSize.width ) {
			right = left + minCropSize.width;
		}

		if ( bottom - top <= minCropSize.height ) {
			top = bottom - minCropSize.height;
		}

		this.updateCrop( {
			top,
			right,
		} );
	}

	onBottomRightDrag( x, y ) {
		const { left, top } = this.state;
		const { minCropSize } = this.props;

		let bottom = y;
		let right = x;

		if ( right - left <= minCropSize.width ) {
			right = left + minCropSize.width;
		}

		if ( bottom - top <= minCropSize.height ) {
			bottom = top + minCropSize.height;
		}

		this.updateCrop( {
			bottom,
			right,
		} );
	}

	onBottomLeftDrag( x, y ) {
		const { right, top } = this.state;
		const { minCropSize } = this.props;

		let bottom = y;
		let left = x;

		if ( right - left <= minCropSize.width ) {
			left = right - minCropSize.width;
		}

		if ( bottom - top <= minCropSize.height ) {
			bottom = top + minCropSize.height;
		}

		this.updateCrop( {
			bottom,
			left,
		} );
	}

	onBorderDrag( x, y ) {
		const { top, left, right, bottom } = this.state;
		const width = right - left;
		const height = bottom - top;

		this.setState( {
			top: y,
			left: x,
			bottom: y + height,
			right: x + width,
		} );
	}

	getCropBounds() {
		const { top, left, right, bottom } = this.state;

		const { topBound, leftBound, rightBound, bottomBound } = this.props.bounds;

		const currentTop = top - topBound;
		const currentLeft = left - leftBound;
		const currentWidth = right - left;
		const currentHeight = bottom - top;

		const imageWidth = rightBound - leftBound;
		let imageHeight = bottomBound - topBound;

		const rotated = this.props.degrees % 180 !== 0;

		if ( this.props.originalAspectRatio ) {
			const { width, height } = this.props.originalAspectRatio;
			const originalImageWidth = rotated ? height : width;
			const originalImageHeight = rotated ? width : height;

			// avoid compounding rounding errors
			const ratio = originalImageHeight / originalImageWidth;
			imageHeight = imageWidth * ratio;
		}

		return [
			currentTop / imageHeight,
			currentLeft / imageWidth,
			currentWidth / imageWidth,
			currentHeight / imageHeight,
		];
	}

	applyCrop() {
		this.props.imageEditorCrop( ...this.getCropBounds() );
	}

	applyComputedCrop() {
		this.props.imageEditorComputedCrop( ...this.getCropBounds() );
	}

	render() {
		const { top, left, right, bottom } = this.state;

		const width = right - left;
		const height = bottom - top;
		const handleClassName = 'image-editor__crop-handle';

		const { topBound, leftBound, rightBound, bottomBound } = this.props.bounds;

		return (
			<div>
				<div
					className="image-editor__crop-background"
					style={ {
						top: topBound + 'px',
						left: left + 'px',
						width: width + 'px',
						height: Math.max( 0, top - topBound ) + 'px',
					} }
				/>
				<div
					className="image-editor__crop-background"
					style={ {
						top: topBound + 'px',
						left: leftBound + 'px',
						width: Math.max( 0, left - leftBound ) + 'px',
						height: Math.max( 0, bottomBound - topBound ) + 'px',
					} }
				/>
				<div
					className="image-editor__crop-background"
					style={ {
						top: bottom + 'px',
						left: left + 'px',
						width: width + 'px',
						height: Math.max( 0, bottomBound - bottom ) + 'px',
					} }
				/>
				<div
					className="image-editor__crop-background"
					style={ {
						top: topBound + 'px',
						left: right + 'px',
						width: Math.max( 0, rightBound - right ) + 'px',
						height: Math.max( 0, bottomBound - topBound ) + 'px',
					} }
				/>
				<Draggable
					ref="border"
					onDrag={ this.onBorderDrag }
					onStop={ this.applyCrop }
					x={ left }
					y={ top }
					width={ width }
					height={ height }
					bounds={ {
						top: topBound,
						left: leftBound,
						bottom: bottomBound,
						right: rightBound,
					} }
					className="image-editor__crop"
				/>
				<Draggable
					onDrag={ this.onTopLeftDrag }
					onStop={ this.applyCrop }
					x={ left }
					y={ top }
					controlled
					bounds={ {
						bottom,
						right,
						top: topBound,
						left: leftBound,
					} }
					ref="topLeft"
					className={ classNames( handleClassName, handleClassName + '-nwse' ) }
				/>
				<Draggable
					onDrag={ this.onTopRightDrag }
					onStop={ this.applyCrop }
					y={ top }
					x={ right }
					controlled
					bounds={ {
						bottom,
						left,
						top: topBound,
						right: rightBound,
					} }
					ref="topRight"
					className={ classNames( handleClassName, handleClassName + '-nesw' ) }
				/>
				<Draggable
					onDrag={ this.onBottomRightDrag }
					onStop={ this.applyCrop }
					y={ bottom }
					x={ right }
					controlled
					bounds={ {
						top,
						left,
						bottom: bottomBound,
						right: rightBound,
					} }
					ref="bottomRight"
					className={ classNames( handleClassName, handleClassName + '-nwse' ) }
				/>
				<Draggable
					onDrag={ this.onBottomLeftDrag }
					onStop={ this.applyCrop }
					y={ bottom }
					x={ left }
					controlled
					bounds={ {
						top,
						right,
						bottom: bottomBound,
						left: leftBound,
					} }
					ref="bottomLeft"
					className={ classNames( handleClassName, handleClassName + '-nesw' ) }
				/>
			</div>
		);
	}
}

export default connect(
	( state ) => {
		const bounds = getImageEditorCropBounds( state );
		const crop = getImageEditorCrop( state );
		const aspectRatio = getImageEditorAspectRatio( state );
		const { degrees } = getImageEditorTransform( state );

		return {
			bounds,
			crop,
			aspectRatio,
			degrees,
			originalAspectRatio: getImageEditorOriginalAspectRatio( state ),
			imageEditorHasChanges: imageEditorHasChanges( state ),
		};
	},
	{
		imageEditorCrop,
		imageEditorComputedCrop,
	}
)( ImageEditorCrop );
