load('../XSLTProcessor.class');

<!-- define stylesheet as E4X XML object -->
var xsltProcessor = new XSLTProcessor(
    <xsl:stylesheet version="2.0"
        xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:output indent="yes" />
        <xsl:param name="param" />
        <xsl:template match="/">
            <root>
                <param>
                    <xsl:copy-of select="$param" />
                </param>
                <input>
                    <xsl:copy-of select="current()" />
                </input>
            </root>
        </xsl:template>
    </xsl:stylesheet>
);

// transform minimal xml document
print(xsltProcessor.transform());

// transform E4X XML document
print(xsltProcessor.transform(<root />));

// transform XML document defined as JSON
print(xsltProcessor.transform({
    'hello': 'world'
}));

// pass E4X XML document as parameter
xsltProcessor.setParameter('param', (
    <hello>world</hello>
));
// transform XML document defined as JSON
print(xsltProcessor.transform([1, 2, 3]));

// pass E4X XML document as JavaScript value
xsltProcessor.setParameter('param', 'test');
// transform external XML document
print(xsltProcessor.transform('build.xml'));

// clear all parameters
xsltProcessor.clearParameters();
// change output method to text
xsltProcessor.setOutputProperty('method', 'text');
// transform XML document defined as JavaScript value
print(xsltProcessor.transform(true));

<!-- load XLST stylesheet from file -->
var xsltProcessor = new XSLTProcessor('test.xsl');
// set output properties (no matter what's defined in XSLT)
xsltProcessor.setOutputProperty('method', 'xml');
xsltProcessor.setOutputProperty('indent', 'yes');
// set parameter in custom namespace
xsltProcessor.setParameter('{http://www.angrycoding.com/}foo', 3.14);
print(xsltProcessor.transform());
