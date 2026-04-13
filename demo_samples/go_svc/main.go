package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"net/http"
)

func sign(data []byte) ([]byte, error) {
	priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, err
	}
	h := sha256.Sum256(data)
	return ecdsa.SignASN1(rand.Reader, priv, h[:])
}

func main() {
	cfg := &tls.Config{
		MinVersion: tls.VersionTLS12,
		CurvePreferences: []tls.CurveID{tls.X25519, tls.CurveP256},
	}
	_ = &http.Server{Addr: ":8443", TLSConfig: cfg}
}
