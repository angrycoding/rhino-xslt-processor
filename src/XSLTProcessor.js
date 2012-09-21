/**
 * XSLTProcessor.js (v1.0) - XSLT processor JavaScript interface.
 * Runs in Mozilla Rhino JavaScript engine and attempts to use
 * Saxon XSLT processor to perform XSLT transformations.
 * Uses default Java XSLT processor as a fallback.
 * http://www.angrycoding.com/
 * Copyright (c) 2011 Ruslan Matveev
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var XSLTProcessor = (function() {

	/**
	 * Class name, used to instantiate TransformerFactory.
	 * @type {string}
	 * @const
	 */
	var TRANSFORMER_FACTORY_IMPL = 'net.sf.saxon.TransformerFactoryImpl';

	/**
	 * Provides a separate namespace for most often used Java classes.
	 * @type {Object}
	 */
	var Java = JavaImporter(
		java.lang.Class,
		java.io.StringReader,
		java.io.StringWriter,
		org.xml.sax.InputSource,
		javax.xml.transform.URIResolver,
		javax.xml.transform.dom.DOMSource,
		javax.xml.transform.stream.StreamResult,
		javax.xml.transform.stream.StreamSource,
		javax.xml.transform.TransformerFactory,
		javax.xml.parsers.DocumentBuilderFactory
	);

	/**
	 * Instance of TRANSFORMER_FACTORY_IMPL class,
	 * or javax.xml.transform.TransformerFactory,
	 * if TRANSFORMER_FACTORY_IMPL is not loaded.
	 * @type {Object}
	 */
	var transformerFactory = (function() {
		var factoryClassRef = null;
		try {
			// try to initialize transformer factory
			factoryClassRef = Java.Class.forName(TRANSFORMER_FACTORY_IMPL);
		} catch (error) {
			// let user know about the problem
			print(
				'XSLTProcessor: could not instantiate ' +
				TRANSFORMER_FACTORY_IMPL +
				', switching to standard implementation.\r\n',
				error
			);
			// use standard TransformerFactory as fallback
			factoryClassRef = Java.TransformerFactory;
		}
		// instantiate transformer factory
		return factoryClassRef.newInstance();
	}());

	/**
	 * Instance of DocumentBuilder class, used to transfer
	 * XML documents from JavaScript into XSLT transformation.
	 * @type {Object}
	 */
	var documentBuilder = (function() {
		var factoryClassRef = Java.DocumentBuilderFactory;
		var factoryInstance = factoryClassRef.newInstance();
		return factoryInstance.newDocumentBuilder();
	})();

	/**
	 * Returns true if the value is undefined.
	 * @param {*} value Value to check.
	 * @return {boolean} Returns true if the value is undefined.
	 */
	function isUndefined(value) {
		return (typeof(value) === 'undefined');
	}

	/**
	 * Returns true if the value is null.
	 * @param {*} value Value to check.
	 * @return {boolean} Returns true if the value is null.
	 */
	function isNull(value) {
		return (value === null);
	}

	/**
	 * Returns true if the value is string.
	 * @param {*} value Value to check.
	 * @return {boolean} Returns true if the value is string.
	 */
	function isString(value) {
		return (typeof(value) === 'string');
	}

	/**
	 * Returns true if the value is function.
	 * @param {*} value Value to check.
	 * @return {boolean} Returns true if the value is function.
	 */
	function isFunction(value) {
		return (typeof(value) === 'function');
	}

	/**
	 * Returns true if the value is object.
	 * @param {*} value Value to check.
	 * @return {boolean} Returns true if the value is object.
	 */
	function isObject(value) {
		return (!isNull(value) && typeof(value) === 'object');
	}

	/**
	 * Returns true if the value is array.
	 * @param {*} value Value to check.
	 * @return {boolean} Returns true if the value is array.
	 */
	function isArray(value) {
		return (isObject(value) && value.constructor === Array);
	}

	/**
	 * Returns true if the value is E4X XML object.
	 * @param {*} value Value to check.
	 * @return {boolean} Returns true if the value is E4X XML object.
	 */
	function isXML(value) {
		return (typeof(value) === 'xml');
	}

	/**
	 * Converts value to XML string.
	 * @param {*} value Value to convert.
	 * @return {string} Returns value converted to XML string.
	 */
	function value2xml(value) {
		return ('<root>' + (isObject(value) ? function(value) {
			var result = '';
			if (isArray(value)) {
				for (var c = 0; c < value.length; c++) {
					result += '<item index="' + c + '">';
					result += arguments.callee(value[c]);
					result += '</item>';
				}
			} else if (isObject(value)) {
				for (var key in value) {
					if (value.hasOwnProperty(key)) {
						result += '<' + key + '>';
						result += arguments.callee(value[key]);
						result += '</' + key + '>';
					}
				}
			} else {
				result = String(value || '');
			}
			return result;
		}(value) : value || '') + '</root>');
	}

	/**
	 * Constructs XSLTProcessor instance.
	 * @param {Object|string|*} xsltStyleSheet stylesheet that can be:
	 *     - actual stylesheet (as E4X XML object)
	 *     - stylesheet filename (will be loaded from file)
	 * @return {Object} Returns an instance of XSLTProcessor.
	 * @constructor
	 */
	return function(xsltStyleSheet) {

		// initialize transformer
		var transformer = null;
		// initialize xslt stylesheet string
		var xsltStyleSheetStr = '';

		// check argument type
		if (isXML(xsltStyleSheet)) {
			// serialize E4X XML document to string
			xsltStyleSheetStr = xsltStyleSheet.toXMLString();
		} else {
			try {
				// convert argument to string
				xsltStyleSheet = String(xsltStyleSheet || '');
				// try to load stylesheet from the file
				xsltStyleSheetStr = readFile(xsltStyleSheet);
			} catch (error) {
				throw('File not found:' + xsltStyleSheet);
			}
		}

		// prepare transformer
		try {
			// try to instantiate transformer
			transformer = transformerFactory.newTransformer(
				// create javax.xml.transform.Source out of stylsheet string
				new Java.StreamSource(new Java.StringReader(xsltStyleSheetStr))
			);
		} catch (error) {
			// XSLT parsing error
			throw('Problem with XSLT stylesheet:' + xsltStyleSheetStr);
		}

		// create and set default URI resolver
		transformer.setURIResolver(
			new Java.URIResolver({
				'resolve': function(uriResolver) {
					return function(href, base) {
						if (this.callback) {
							var source = this.callback(href, base);
							if (isString(source)) {
								return new Java.StreamSource(source);
							} else if (isXML(source)) {
								source = source.toXMLString();
								return new Java.StreamSource(
									new Java.StringReader(source)
								);
							} else {
								source = value2xml(source);
								return new Java.StreamSource(
									new Java.StringReader(source)
								);
							}
						}
						// use standard uri resolver
						return uriResolver.resolve(href, base);
					}
				}(transformer.getURIResolver())
			}
		));

		/**
		 * Sets a function that will be used as uri resolver,
		 * if the callback is null, standard one will be used instead,
		 * if the callback is not null and not a function, does nothing.
		 * @param {Function|null} callback Uri resolver callback function,
		 *     or null if needs to be cleared.
		 */
		function setUriResolver(callback) {
			var uriResolver = transformer.getURIResolver();
			if (isNull(callback)) {
				delete uriResolver.self.callback;
			} else if (isFunction(callback)) {
				uriResolver.self.callback = callback;
			}
		}

		/**
		 * Retrieves uri resolver that is previously set by setUriResolver
		 * or null if the standard one is currently in use.
		 * @return {Function|null} Returns uri resolver callback function.
		 */
		function getUriResolver() {
			var uriResolver = transformer.getURIResolver();
			return (uriResolver.self.callback || null);
		}

		/**
		 * Sets a parameter for the transformation.
		 * @param {string} name Parameter name.
		 * @param {Object|*} value Parameter value that can be:
		 *     - XML document (as E4X XML object)
		 *     - JavaScript object (value2xml will convert it to XML)
		 *     - anything else (will be converted to string)
		 */
		function setParameter(name, value) {
			if (!isString(name)) return;
			try {
				if (isXML(value) || isObject(value)) {
					var stringReader = new Java.StringReader(
						isXML(value) ? value.toXMLString() : value2xml(value)
					);
					var inputSource = new Java.InputSource(stringReader);
					var xmlDocument = documentBuilder.parse(inputSource);
					transformer.setParameter(name, xmlDocument);
				} else {
					// in theory only Function object has to be converted to
					// a string, but I'm going to do it for all types, since
					// that there is a complications with serializing it back
					// to the original types in getParameter function.
					transformer.setParameter(name, String(value));
				}
			} catch (error) {
				throw('Could not set parameter: ' + name + ' to ' + value);
			}
		}

		/**
		 * Returns a parameter value that was set with setParameter.
		 * @param {string} name Parameter name.
		 * @return {*} Returns parameter value (as it is).
		 */
		function getParameter(name) {
			try {
				// get parameter value
				var parameterValue = transformer.getParameter(name);
				// check if the parameter is set
				if (isObject(parameterValue) &&
					// couldn't come up with anything safer than this
					isFunction(parameterValue.createProcessingInstruction)) {
					// create serializer instance
					var serializer = transformerFactory.newTransformer();
					// https://bugzilla.mozilla.org/show_bug.cgi?id=336551
					serializer.setOutputProperty(
						'omit-xml-declaration', 'yes'
					);
					var result = new Java.StringWriter();
					var output = new Java.StreamResult(result);
					var input = new Java.DOMSource(parameterValue);
					// serialize XML document to string
					serializer.transform(input, output);
					// return E4X XML object
					return new XML(result);
				} else {
					// in theory this can be int / bool and so on,
					// but I'm just going to return a string
					return String(parameterValue);
				}
			} catch (error) {
				throw('Could not get a parameter: ' + name);
			}
		}

		/**
		 * Clears all parameters set with setParameter.
		 */
		function clearParameters() {
			transformer.clearParameters();
		}

		/**
		 * Sets an output property that will affect transformation result.
		 * Note that the property set by this method cannot be overwritten,
		 * by setting it as xsl:output attribute value (becomes sealed).
		 * @param {string} name Output property name.
		 * @param {string} value Output property value.
		 */
		function setOutputProperty(name, value) {
			if (!isString(name)) return;
			// convert value to string
			value = (String(value) || '');
			try {
				// set output property
				transformer.setOutputProperty(name, value);
			} catch (error) {
				throw('Could not set output property:' + name + ' to ' + value);
			}
		}

		/**
		 * Gets an output property value that was set with
		 * setOutputProperty or xsl:output attribute in XSLT stylesheet.
		 * @param {string} name Output property name.
		 */
		function getOutputProperty(name) {
			// get list of all output properties
			var props = transformer.getOutputProperties();
			// check if we have requested property
			if (props.containsKey(name)) {
				// convert to string and return
				return String(props.get(name));
			}
		}

		/**
		 * Retrieves list of all output properties that was set with
		 * setOutputProperty or xsl:output attribute in XSLT stylesheet.
		 */
		function getOutputProperties() {
			var result = {};
			// get list of all output properties
			var props = transformer.getOutputProperties();
			// get list of all property names
			var propNames = props.stringPropertyNames();
			for each(propName in propNames.toArray()) {
				// convert to string and put it into result object
				result[propName] = String(props.get(propName));
			}
			return result;
		}

		/**
		 * Performs XLST transformation on given XML document.
		 * @param {Object|string|*} xmlDocument XML document that can be:
		 *     - actual XML document (as E4X XML object)
		 *     - XML document filename (will be loaded from file)
		 *     - anything else (value2xml will be used to convert it to XML)
		 * @return {String} Returns transformation result as string.
		 */
		function transform(xmlDocument) {
			// initialize xml document string
			var xmlDocumentStr = '';
			// check argument type
			if (isXML(xmlDocument)) {
				// serialize E4X XML document to string
				xmlDocumentStr = xmlDocument.toXMLString();
			} else if (isString(xmlDocument)) {
				try {
					// try to load xml document from the file
					xmlDocumentStr = readFile(xmlDocument);
				} catch (error) {
					throw('File does not exist:' + xmlDocument);
				}
			} else {
				// fallback: convert argument to XML string
				xmlDocumentStr = value2xml(xmlDocument);
			}
			try {
				// initialize result writer
				var result = new Java.StringWriter();
				// initialize output stream
				var output = new Java.StreamResult(result);
				// initialize input stream
				var input = new Java.StreamSource(
					new Java.StringReader(xmlDocumentStr)
				);
				// try to perform the transformation
				transformer.transform(input, output);
				// return serialized output stream
				return String(result);
			} catch (error) {
				// XML parsing, or XSLT transforming error
				throw('Problem with XML document:', xmlDocumentStr);
			}
		}

		// instance members
		return {
			'getUriResolver': getUriResolver,
			'setUriResolver': setUriResolver,
			'setOutputProperty': setOutputProperty,
			'getOutputProperties': getOutputProperties,
			'getOutputProperty': getOutputProperty,
			'getParameter': getParameter,
			'setParameter': setParameter,
			'clearParameters': clearParameters,
			'transform': transform
		};
	};
})();