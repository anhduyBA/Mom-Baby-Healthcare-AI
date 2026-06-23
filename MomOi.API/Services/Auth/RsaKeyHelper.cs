using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.IO;
using System.Security.Cryptography;

namespace MomOi.API.Services.Auth
{
    /// <summary>
    /// Helper class to provide RSA security keys for RS256 signing and validation.
    /// </summary>
    public static class RsaKeyHelper
    {
        private static RSA? _developerKey;
        private static readonly object _lock = new object();

        /// <summary>
        /// Gets the developer RSA key pair generated in-memory or persisted in a temp file.
        /// </summary>
        public static RSA GetDeveloperKey()
        {
            if (_developerKey == null)
            {
                lock (_lock)
                {
                    if (_developerKey == null)
                    {
                        var keyPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "temp_dev_key.pem");
                        _developerKey = RSA.Create();

                        if (File.Exists(keyPath))
                        {
                            try
                            {
                                var pem = File.ReadAllText(keyPath);
                                _developerKey.ImportFromPem(pem);
                            }
                            catch
                            {
                                _developerKey.Dispose();
                                _developerKey = RSA.Create(2048);
                                try
                                {
                                    File.WriteAllText(keyPath, _developerKey.ExportPkcs8PrivateKeyPem());
                                }
                                catch { }
                            }
                        }
                        else
                        {
                            _developerKey = RSA.Create(2048);
                            try
                            {
                                File.WriteAllText(keyPath, _developerKey.ExportPkcs8PrivateKeyPem());
                            }
                            catch { }
                        }
                    }
                }
            }
            return _developerKey;
        }

        /// <summary>
        /// Returns the RSA key to use for signing tokens.
        /// </summary>
        public static RsaSecurityKey GetSigningKey(IConfiguration configuration)
        {
            var privateKeyPem = configuration["Jwt:PrivateKey"];
            if (!string.IsNullOrEmpty(privateKeyPem))
            {
                try
                {
                    var rsa = RSA.Create();
                    rsa.ImportFromPem(privateKeyPem);
                    return new RsaSecurityKey(rsa);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error loading RSA Private Key from config: {ex.Message}. Falling back to developer key.");
                }
            }

            return new RsaSecurityKey(GetDeveloperKey());
        }

        /// <summary>
        /// Returns the RSA key to use for validating tokens.
        /// </summary>
        public static RsaSecurityKey GetValidationKey(IConfiguration configuration)
        {
            var publicKeyPem = configuration["Jwt:PublicKey"];
            if (!string.IsNullOrEmpty(publicKeyPem))
            {
                try
                {
                    var rsa = RSA.Create();
                    rsa.ImportFromPem(publicKeyPem);
                    return new RsaSecurityKey(rsa);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error loading RSA Public Key from config: {ex.Message}. Falling back to developer key.");
                }
            }

            // In dev, public key is extracted from the developer private key
            return new RsaSecurityKey(GetDeveloperKey());
        }
    }
}
