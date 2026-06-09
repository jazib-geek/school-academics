using Amazon.Runtime;
using Amazon.S3;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using School.Application.Common;
using School.Application.DTOs;
using School.Application.Interfaces;

namespace School.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StorageController : ControllerBase
{
    private readonly IObjectStorageService _objectStorage;

    public StorageController(IObjectStorageService objectStorage)
    {
        _objectStorage = objectStorage;
    }

    /// <summary>Multipart upload to Backblaze B2 (S3-compatible). Used by the campus portal upload test page.</summary>
    [HttpPost("test-upload")]
    [RequestSizeLimit(52_428_800)]
    public async Task<IActionResult> TestUpload(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("Choose a non-empty file."));
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await _objectStorage.UploadTestFileAsync(
                stream,
                file.FileName,
                file.ContentType,
                cancellationToken);

            if (result == null)
            {
                return StatusCode(
                    StatusCodes.Status503ServiceUnavailable,
                    ApiResponse<object>.FailureResponse(
                        "Object storage is not configured. Set Backblaze:KeyId and Backblaze:ApplicationKey in appsettings (same B2 application key pair), plus ServiceUrl, BucketName."));
            }

            return Ok(ApiResponse<ObjectStorageUploadResultDto>.SuccessResponse(result, "Uploaded to B2."));
        }
        catch (AmazonS3Exception ex)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                ApiResponse<object>.FailureResponse(
                    $"{ex.Message} Use Key id and Application key from the same row in Backblaze (Application Keys)."));
        }
        catch (AmazonClientException ex)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    /// <summary>Download a file from B2 by object key (JWT required). Example key: test-uploads/&lt;guid&gt;-filename.xlsx</summary>
    [HttpGet("download")]
    public async Task<IActionResult> Download([FromQuery] string key, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return BadRequest(ApiResponse<object>.FailureResponse("Query parameter \"key\" is required."));
        }

        var normalized = key.Trim().Replace('\\', '/');
        if (!normalized.StartsWith("test-uploads/", StringComparison.Ordinal) ||
            normalized.Contains("..", StringComparison.Ordinal))
        {
            return BadRequest(
                ApiResponse<object>.FailureResponse("Only object keys under test-uploads/ are allowed."));
        }

        try
        {
            var dto = await _objectStorage.GetObjectAsync(key, cancellationToken);
            if (dto == null)
            {
                return StatusCode(
                    StatusCodes.Status503ServiceUnavailable,
                    ApiResponse<object>.FailureResponse(
                        "Object storage is not configured, or the key is not allowed."));
            }

            return File(dto.Stream, dto.ContentType, dto.FileName);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return NotFound(ApiResponse<object>.FailureResponse("No such object in the bucket."));
        }
        catch (AmazonS3Exception ex)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (AmazonClientException ex)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                ApiResponse<object>.FailureResponse(ex.Message));
        }
    }
}
