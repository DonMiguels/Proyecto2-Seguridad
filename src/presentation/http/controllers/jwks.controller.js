export class JwksController {
  constructor({ jwtKeysetService }) {
    this.jwtKeysetService = jwtKeysetService;
  }

  getJwks = (_req, res) => {
    if (!this.jwtKeysetService.hasPublicJwks()) {
      return res.status(404).json({
        error: 'JWKS is not enabled for the current JWT algorithm',
      });
    }

    return res.status(200).json(this.jwtKeysetService.getJwks());
  };
}
