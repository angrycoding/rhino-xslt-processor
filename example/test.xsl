<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:ac="http://www.angrycoding.com/">

	<xsl:output method="text" />
	<xsl:param name="ac:foo" />

	<xsl:template match="/">
		<foo>
			<is>
				<bar>
					<xsl:copy-of select="$ac:foo" />
				</bar>
			</is>
		</foo>
	</xsl:template>

</xsl:stylesheet>