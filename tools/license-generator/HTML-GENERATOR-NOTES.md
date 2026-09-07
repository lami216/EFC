# EFC HTML activation generator

The distributed activation tool is `efc-license-generator.html`.

It runs offline and never embeds or uploads the private signing key. The operator selects the PKCS#8 PEM private key locally for each signing session. The generated `.efc-license` payload and ECDSA P-256/SHA-256 signature remain compatible with the native EFC verifier.
