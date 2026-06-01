const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const BASE_URL = "https://customer.nesco.gov.bd/pre/panel";

async function getTokenAndCookies() {
    const response = await axios.get(BASE_URL);

    const $ = cheerio.load(response.data);

    const token = $('input[name="_token"]').val();

    if (!token) {
        throw new Error("Unable to extract CSRF token");
    }

    return {
        token,
        cookies: response.headers["set-cookie"] || []
    };
}

async function submitRequest(
    custNo,
    submitValue,
    responseType = "text"
) {
    const { token, cookies } =
        await getTokenAndCookies();

    const form = new URLSearchParams();

    form.append("_token", token);
    form.append("cust_no", custNo);
    form.append("submit", submitValue);

    const response = await axios.post(
        BASE_URL,
        form.toString(),
        {
            responseType,
            headers: {
                Cookie: cookies.join("; "),
                "Content-Type":
                    "application/x-www-form-urlencoded"
            }
        }
    );

    return response;
}

function parseCustomerInfo($) {
    const inputs =
        $("#con_info_div input");

    return {
        name:
            inputs.eq(0).val()?.trim() || "",

        fatherOrHusband:
            inputs.eq(1).val()?.trim() || "",

        address:
            inputs.eq(2).val()?.trim() || "",

        mobile:
            inputs.eq(3).val()?.trim() || "",

        office:
            inputs.eq(4).val()?.trim() || "",

        feeder:
            inputs.eq(5).val()?.trim() || "",

        consumerNo:
            inputs.eq(6).val()?.trim() || "",

        meterNo:
            inputs.eq(7).val()?.trim() || "",

        sanctionedLoad:
            inputs.eq(8).val()?.trim() || "",

        tariff:
            inputs.eq(9).val()?.trim() || "",

        meterType:
            inputs.eq(10).val()?.trim() || "",

        meterStatus:
            inputs.eq(11).val()?.trim() || "",

        installDate:
            inputs.eq(12).val()?.trim() || "",

        minimumRecharge:
            inputs.eq(13).val()?.trim() || "",

        balance:
            inputs.eq(14).val()?.trim() || ""
    };
}

function parseRechargeHistory($) {
    const history = [];

    $(".consumerRechargeData").each(
        (i, el) => {
            history.push({
                orderId:
                    $(el).attr("data-order") || "",

                tokenNo:
                    $(el).attr("data-token") || "",

                seqNo:
                    $(el).attr("data-seq") || "",

                meterRent:
                    Number(
                        $(el).attr("data-rent") || 0
                    ),

                demandCharge:
                    Number(
                        $(el).attr(
                            "data-demandcharge"
                        ) || 0
                    ),

                vat:
                    Number(
                        $(el).attr("data-tax") || 0
                    ),

                pfcCharge:
                    Number(
                        $(el).attr("data-pfc") || 0
                    ),

                subsidy:
                    Number(
                        $(el).attr(
                            "data-subsidyamount"
                        ) || 0
                    ),

                electricityAmount:
                    Number(
                        $(el).attr(
                            "data-purchaseamount"
                        ) || 0
                    ),

                rechargeAmount:
                    Number(
                        $(el).attr(
                            "data-totalamount"
                        ) || 0
                    ),

                energyUnit:
                    Number(
                        $(el).attr(
                            "data-purchaseenergy"
                        ) || 0
                    ),

                method:
                    $(el).attr(
                        "data-salename"
                    ) || "",

                rechargeDate:
                    $(el).attr(
                        "data-purchasedate"
                    ) || "",

                debtAmount:
                    Number(
                        $(el).attr(
                            "data-debtamount"
                        ) || 0
                    ),

                paidAmount:
                    Number(
                        $(el).attr(
                            "data-paidamount"
                        ) || 0
                    ),

                meterNo:
                    $(el).attr(
                        "data-meterno"
                    ) || "",

                customerNo:
                    $(el).attr(
                        "data-customerno"
                    ) || "",

                customerName:
                    $(el).attr(
                        "data-customername"
                    ) || "",

                tariff:
                    $(el).attr(
                        "data-tariff"
                    ) || "",

                organization:
                    $(el).attr(
                        "data-organization"
                    ) || ""
            });
        }
    );

    return history;
}

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        service: "NESCO API"
    });
});

app.get(
    "/api/meter/:custNo",
    async (req, res) => {
        try {
            const custNo =
                req.params.custNo;

            const response =
                await submitRequest(
                    custNo,
                    "রিচার্জ হিস্ট্রি"
                );

            const $ =
                cheerio.load(
                    response.data
                );

            const customer =
                parseCustomerInfo($);

            const rechargeHistory =
                parseRechargeHistory($);

            res.json({
                success: true,
                customer,
                rechargeHistory,

                endpoints: {
                    rechargeHistoryPdf:
                        `/api/meter/${custNo}/recharge-history/pdf`,

                    certificatePdf:
                        `/api/meter/${custNo}/certificate/pdf`
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message:
                    error.message
            });
        }
    }
);

app.get(
    "/api/meter/:custNo/recharge-history/pdf",
    async (req, res) => {
        try {
            const response =
                await submitRequest(
                    req.params.custNo,
                    "রিচার্জ হিস্ট্রি ডাউনলোড করুন",
                    "arraybuffer"
                );

            res.setHeader(
                "Content-Type",
                "application/pdf"
            );

            res.setHeader(
                "Content-Disposition",
                `inline; filename="${req.params.custNo}-recharge-history.pdf"`
            );

            res.send(
                response.data
            );
        } catch (error) {
            res.status(500).json({
                success: false,
                message:
                    error.message
            });
        }
    }
);

app.get(
    "/api/meter/:custNo/certificate/pdf",
    async (req, res) => {
        try {
            const response =
                await submitRequest(
                    req.params.custNo,
                    "সার্টিফিকেট ডাউনলোড করুন",
                    "arraybuffer"
                );

            res.setHeader(
                "Content-Type",
                "application/pdf"
            );

            res.setHeader(
                "Content-Disposition",
                `inline; filename="${req.params.custNo}-certificate.pdf"`
            );

            res.send(
                response.data
            );
        } catch (error) {
            res.status(500).json({
                success: false,
                message:
                    error.message
            });
        }
    }
);

app.listen(5000, () => {
    console.log(
        "Server running on port 5000"
    );
});